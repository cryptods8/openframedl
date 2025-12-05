import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
import React from "react";
import {
  useAccount,
  useConnect,
  useWaitForTransactionReceipt,
  useWriteContract,
  useSwitchChain,
  useReadContract,
} from "wagmi";
import { AnimatedBorder } from "./animated-border";
import { Button } from "./button/button";
import { decodeEventLog, parseEther, parseUnits } from "viem";
import { MintMetadata } from "../db/pg/types";

const MINT_PRICE = process.env.NEXT_PUBLIC_GAME_NFT_MINT_PRICE || "0.0004";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_NFT_CA as `0x${string}`;
const CONTRACT_ABI = [
  {
    name: "mintGame",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "gameId", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "mintGameWithToken",
    type: "function",
    inputs: [{ name: "gameId", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "gameId",
        type: "string",
      },
    ],
    name: "GameMinted",
    type: "event",
  },
] as const;

// ERC20 ABI for allowance and approve functions
const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

const CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_GAME_NFT_CHAIN_ID || "84532",
  10
);

const CHAIN_CONFIGS = {
  "84532": {
    id: 84532,
    name: "Base Sepolia",
  },
  "8453": {
    id: 8453,
    name: "Base",
  },
} as Record<string, { id: number; name: string }>;
const CHAIN_CONFIG: { id: number; name: string } = CHAIN_CONFIGS[CHAIN_ID] || {
  id: 0,
  name: "Unknown",
};

if (process.env.NEXT_PUBLIC_GAME_NFT_CHAIN_ID && CHAIN_CONFIG.id === 0) {
  throw new Error(
    `Invalid NEXT_PUBLIC_GAME_NFT_CHAIN_ID: ${process.env.NEXT_PUBLIC_GAME_NFT_CHAIN_ID}`
  );
}

interface TokenMetadata {
  address: `0x${string}`;
  decimals: number;
  name: string;
  symbol: string;
  price: string;
}

interface MintButtonProps {
  gameId: string;
  erc20Token?: TokenMetadata; // Optional ERC20 token
  onMintStarted: ({
    hash,
    chainId,
    walletAddress,
  }: Pick<MintMetadata, "hash" | "chainId" | "walletAddress">) => void;
  onMint: ({
    hash,
    chainId,
    tokenId,
    walletAddress,
  }: Pick<
    MintMetadata,
    "hash" | "chainId" | "tokenId" | "walletAddress"
  >) => void;
  onError: (error: string | undefined) => void;
}

function isUserRejectionError(error: unknown): boolean {
  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : "";

  return (
    errorMessage.includes("user rejected") ||
    errorMessage.includes("user denied") ||
    errorMessage.includes("action_rejected")
  );
}

function extractTokenId(data?: {
  logs: {
    data: `0x${string}`;
    topics: [] | [signature: `0x${string}`, ...args: `0x${string}`[]];
  }[];
}): string | undefined {
  const logs = data?.logs;
  if (!logs || logs.length === 0) {
    return undefined;
  }
  for (const log of logs) {
    try {
      const decodedLog = decodeEventLog({
        abi: CONTRACT_ABI,
        data: log.data,
        topics: log.topics,
      });
      // console.log("decodedLog", decodedLog);
      if (decodedLog.eventName === "GameMinted") {
        return decodedLog.args?.[0]?.toString();
      }
    } catch (error) {
      // Handle non-matching logs
    }
  }
  return undefined;
}

export function MintButton({
  gameId,
  erc20Token,
  onMintStarted,
  onMint,
  onError,
}: MintButtonProps) {
  const { isConnected, address, chainId } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const [optimisticApproval, setOptimisticApproval] = React.useState(false);
  const shouldMintAfterApproval = React.useRef(false);

  const { data: hash, isPending, writeContract } = useWriteContract();
  const {
    data: approvalHash,
    isPending: isApprovalPending,
    writeContract: writeApprovalContract,
  } = useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: { enabled: !!hash },
  });
  const { isLoading, isSuccess } = receipt;
  const {
    isLoading: isApprovalReceiptLoading,
    isSuccess: isApprovalReceiptSuccess,
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
    chainId,
    query: { enabled: !!approvalHash },
  });

  const {
    data: allowance,
    isFetching: isAllowanceFetching,
    refetch: refetchAllowance,
  } = useReadContract({
    address: erc20Token?.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && erc20Token?.address
        ? [address, CONTRACT_ADDRESS as `0x${string}`]
        : undefined,
    query: {
      enabled: !!erc20Token?.address && !!address,
    },
  });

  // Calculate required amount in wei
  const requiredAmount = React.useMemo(() => {
    if (!erc20Token?.decimals)
      return parseEther(erc20Token?.price || MINT_PRICE);
    return parseUnits(erc20Token.price, erc20Token.decimals);
  }, [erc20Token?.decimals, erc20Token?.price]);

  // Check if approval is needed
  const needsApproval = React.useMemo(() => {
    if (!erc20Token?.address) return false;
    if (optimisticApproval) return false;
    return !allowance || allowance < requiredAmount;
  }, [erc20Token?.address, allowance, requiredAmount, optimisticApproval]);

  const mintStartedHandled = React.useRef(false);
  React.useEffect(() => {
    if (hash && chainId && address && !mintStartedHandled.current) {
      mintStartedHandled.current = true;
      submitReferral({
        txHash: hash,
        chainId,
      });
      onMintStarted({ hash, chainId, walletAddress: address });
      mintStartedHandled.current = false;
    }
  }, [hash, chainId, address, onMintStarted]);

  // console.log("address", address, chainId);
  // console.log("pending", isPending);
  // console.log("loading", isLoading);
  // console.log("success", isSuccess);
  // console.log("isError", receipt.isError);
  // console.log("error", receipt.error);
  // console.log("data", receipt.data);

  const successHandled = React.useRef(false);
  const tokenId = extractTokenId(receipt.data);

  // console.log("tokenId", tokenId);

  React.useEffect(() => {
    if (isSuccess && !successHandled.current) {
      successHandled.current = true;
      onMint({
        hash: hash || "0x0",
        chainId: CHAIN_CONFIG?.id || 0,
        tokenId,
        walletAddress: address || "0x0",
      });
      successHandled.current = false;
    }
  }, [isSuccess, onMint, hash, tokenId, address]);

  const triggerMint = React.useCallback(() => {
    if (!address) return;

    const dataSuffix = getReferralTag({
      user: address as `0x${string}`,
      consumer: "0x000Cbf0BEC88214AAB15bC1Fa40d3c30b3CA97a9",
    });

    // Mint the game
    if (erc20Token?.address) {
      // Use mintGameWithToken for ERC20 tokens
      writeContract({
        account: address,
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "mintGameWithToken",
        args: [gameId],
        dataSuffix: `0x${dataSuffix}`,
      });
    } else {
      // Use regular mintGame for ETH
      writeContract({
        account: address,
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "mintGame",
        args: [gameId],
        value: parseEther(MINT_PRICE),
        dataSuffix: `0x${dataSuffix}`,
      });
    }
  }, [address, erc20Token, gameId, writeContract]);

  const handleClick = async () => {
    try {
      successHandled.current = false;

      if (!isConnected || !address) {
        connect({ connector: farcasterMiniApp() });
        return;
      }

      if (chainId !== CHAIN_CONFIG?.id) {
        switchChain({ chainId: CHAIN_CONFIG.id });
        return;
      }

      if (erc20Token?.address && needsApproval) {
        shouldMintAfterApproval.current = true;
        // First approve the contract to spend tokens
        writeApprovalContract({
          account: address,
          address: erc20Token.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, requiredAmount],
        });
        return;
      }

      triggerMint();
    } catch (error) {
      if (!isUserRejectionError(error)) {
        onError(
          error instanceof Error ? error.message : "Something went wrong"
        );
      }
      successHandled.current = false;
      shouldMintAfterApproval.current = false;
    }
  };

  React.useEffect(() => {
    if (isApprovalReceiptSuccess) {
      setOptimisticApproval(true);

      if (shouldMintAfterApproval.current) {
        shouldMintAfterApproval.current = false;

        // Wait for allowance to be reflected on-chain before minting
        // This prevents wallet tx scanners from predicting failures due to stale state
        const waitForAllowanceAndMint = async () => {
          const maxAttempts = 10;
          const delayMs = 500;

          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const result = await refetchAllowance();
            const currentAllowance = result.data;

            if (currentAllowance && currentAllowance >= requiredAmount) {
              triggerMint();
              return;
            }

            // Wait before next attempt
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          // If we exhaust retries, mint anyway (optimistic approval is set)
          console.warn(
            "Allowance not reflected after retries, proceeding with mint anyway"
          );
          triggerMint();
        };

        waitForAllowanceAndMint();
      } else {
        refetchAllowance();
      }
    }
  }, [isApprovalReceiptSuccess, refetchAllowance, triggerMint, requiredAmount]);

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (chainId !== CHAIN_CONFIG.id) return `Switch to ${CHAIN_CONFIG.name}`;
    if (erc20Token?.address && needsApproval) return `Collect`;
    return "Collect";
  };

  const isApprovalLoading = isApprovalPending || isApprovalReceiptLoading;

  return isPending || isLoading || isApprovalLoading || isAllowanceFetching ? (
    <AnimatedBorder>
      <Button variant="primary" disabled>
        {isAllowanceFetching
          ? "Checking allowance..."
          : erc20Token?.address && needsApproval
          ? `Approving ${erc20Token.symbol}...`
          : "Collecting..."}
      </Button>
    </AnimatedBorder>
  ) : (
    <Button variant="primary" onClick={handleClick}>
      {getButtonText()}
    </Button>
  );
}
