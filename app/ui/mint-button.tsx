import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import React from "react";
import {
  useAccount,
  useConnect,
  useWaitForTransactionReceipt,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { AnimatedBorder } from "./animated-border";
import { Button } from "./button/button";
import { decodeEventLog, parseEther } from "viem";
import { MintMetadata } from "../db/pg/types";

const MINT_PRICE = process.env.NEXT_PUBLIC_GAME_NFT_MINT_PRICE || "0.0004";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_NFT_CA;
const CONTRACT_ABI = [
  {
    name: "mintGame",
    type: "function",
    stateMutability: "payable",
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

interface MintButtonProps {
  gameId: string;
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
        return decodedLog.args.tokenId.toString();
      }
    } catch (error) {
      // Handle non-matching logs
    }
  }
  return undefined;
}

export function MintButton({
  gameId,
  onMintStarted,
  onMint,
  onError,
}: MintButtonProps) {
  const { isConnected, address, chainId } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const { data: hash, isPending, writeContract } = useWriteContract();

  const receipt = useWaitForTransactionReceipt({ hash, chainId });
  const { isLoading, isSuccess } = receipt;

  const mintStartedHandled = React.useRef(false);
  React.useEffect(() => {
    if (hash && chainId && address && !mintStartedHandled.current) {
      mintStartedHandled.current = true;
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

  const handleClick = async () => {
    try {
      successHandled.current = false;

      if (!isConnected || !address) {
        connect({ connector: farcasterFrame() });
        return;
      }

      if (chainId !== CHAIN_CONFIG?.id) {
        await switchChain({ chainId: CHAIN_CONFIG.id });
        return;
      }

      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "mintGame",
        args: [gameId],
        value: parseEther(MINT_PRICE),
      });
    } catch (error) {
      if (!isUserRejectionError(error)) {
        onError(
          error instanceof Error ? error.message : "Something went wrong"
        );
      }
      successHandled.current = false;
    }
  };

  return isPending || isLoading ? (
    <AnimatedBorder>
      <Button variant="primary" disabled>
        {"Minting..."}
      </Button>
    </AnimatedBorder>
  ) : (
    <Button variant="primary" onClick={handleClick}>
      {!isConnected
        ? "Connect Wallet"
        : chainId !== CHAIN_CONFIG.id
        ? `Switch to ${CHAIN_CONFIG.name}`
        : "Mint"}
    </Button>
  );
}
