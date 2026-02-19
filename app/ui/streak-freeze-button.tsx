"use client";

import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
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
import { parseUnits } from "viem";
import {
  STREAK_FREEZE_ABI,
  STREAK_FREEZE_CONTRACT_ADDRESS,
  STREAK_FREEZE_CHAIN_ID,
  STREAK_FREEZE_TOKEN_ID,
} from "../lib/streak-freeze-contract";

const CONTRACT_ADDRESS = STREAK_FREEZE_CONTRACT_ADDRESS as `0x${string}`;
const CHAIN_ID = STREAK_FREEZE_CHAIN_ID;

const CHAIN_CONFIGS: Record<string, { id: number; name: string }> = {
  "84532": { id: 84532, name: "Base Sepolia" },
  "8453": { id: 8453, name: "Base" },
};
const CHAIN_CONFIG = CHAIN_CONFIGS[String(CHAIN_ID)] || {
  id: CHAIN_ID,
  name: "Unknown",
};

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
] as const;

// --- Purchase Button ---

interface PurchaseStreakFreezeButtonProps {
  onPurchase?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export function PurchaseStreakFreezeButton({
  onPurchase,
  onError,
}: PurchaseStreakFreezeButtonProps) {
  const { isConnected, address, chainId } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: { enabled: !!hash },
  });

  // Read on-chain pricing
  const { data: ethPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: STREAK_FREEZE_ABI,
    functionName: "ethPrice",
    query: { enabled: !!CONTRACT_ADDRESS },
  });

  const { data: erc20Token } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: STREAK_FREEZE_ABI,
    functionName: "erc20Token",
    query: { enabled: !!CONTRACT_ADDRESS },
  });

  const { data: erc20Price } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: STREAK_FREEZE_ABI,
    functionName: "erc20Price",
    query: { enabled: !!CONTRACT_ADDRESS },
  });

  // ERC20 allowance check
  const [optimisticApproval, setOptimisticApproval] = React.useState(false);
  const shouldPurchaseAfterApproval = React.useRef(false);

  const {
    data: approvalHash,
    isPending: isApprovalPending,
    writeContract: writeApprovalContract,
  } = useWriteContract();
  const {
    isLoading: isApprovalReceiptLoading,
    isSuccess: isApprovalReceiptSuccess,
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
    chainId,
    query: { enabled: !!approvalHash },
  });

  const hasErc20 =
    erc20Token &&
    erc20Token !== "0x0000000000000000000000000000000000000000";

  const {
    data: allowance,
    isFetching: isAllowanceFetching,
    refetch: refetchAllowance,
  } = useReadContract({
    address: hasErc20 ? (erc20Token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && hasErc20
        ? [address, CONTRACT_ADDRESS]
        : undefined,
    query: { enabled: !!hasErc20 && !!address },
  });

  const needsApproval = React.useMemo(() => {
    if (!hasErc20 || !erc20Price) return false;
    if (optimisticApproval) return false;
    return !allowance || allowance < erc20Price;
  }, [hasErc20, erc20Price, allowance, optimisticApproval]);

  const purchaseHandled = React.useRef(false);
  React.useEffect(() => {
    if (isSuccess && hash && !purchaseHandled.current) {
      purchaseHandled.current = true;
      // Log purchase to backend
      fetch("/api/streak-freeze/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash }),
      }).catch(console.error);
      onPurchase?.(hash);
      purchaseHandled.current = false;
    }
  }, [isSuccess, hash, onPurchase]);

  const triggerPurchase = React.useCallback(() => {
    if (!address) return;

    if (hasErc20 && erc20Price) {
      writeContract({
        account: address,
        address: CONTRACT_ADDRESS,
        abi: STREAK_FREEZE_ABI,
        functionName: "purchaseWithErc20",
        args: [1n],
      });
    } else if (ethPrice) {
      writeContract({
        account: address,
        address: CONTRACT_ADDRESS,
        abi: STREAK_FREEZE_ABI,
        functionName: "purchaseWithEth",
        args: [1n],
        value: ethPrice,
      });
    }
  }, [address, hasErc20, ethPrice, erc20Price, writeContract]);

  // After approval succeeds, trigger the purchase
  React.useEffect(() => {
    if (isApprovalReceiptSuccess) {
      setOptimisticApproval(true);
      if (shouldPurchaseAfterApproval.current) {
        shouldPurchaseAfterApproval.current = false;
        const waitAndPurchase = async () => {
          for (let i = 0; i < 10; i++) {
            const result = await refetchAllowance();
            if (result.data && erc20Price && result.data >= erc20Price) {
              triggerPurchase();
              return;
            }
            await new Promise((r) => setTimeout(r, 500));
          }
          triggerPurchase();
        };
        waitAndPurchase();
      } else {
        refetchAllowance();
      }
    }
  }, [
    isApprovalReceiptSuccess,
    refetchAllowance,
    triggerPurchase,
    erc20Price,
  ]);

  const handleClick = () => {
    try {
      purchaseHandled.current = false;

      if (!isConnected || !address) {
        connect({ connector: farcasterMiniApp() });
        return;
      }

      if (chainId !== CHAIN_CONFIG.id) {
        switchChain({ chainId: CHAIN_CONFIG.id });
        return;
      }

      if (hasErc20 && needsApproval && erc20Price) {
        shouldPurchaseAfterApproval.current = true;
        writeApprovalContract({
          account: address,
          address: erc20Token as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, erc20Price],
        });
        return;
      }

      triggerPurchase();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Something went wrong";
      onError?.(msg);
    }
  };

  const isApprovalLoading = isApprovalPending || isApprovalReceiptLoading;
  const isBusy =
    isPending || isLoading || isApprovalLoading || isAllowanceFetching;

  if (isBusy) {
    return (
      <AnimatedBorder>
        <Button variant="primary" disabled>
          {isAllowanceFetching
            ? "Checking..."
            : needsApproval
            ? "Approving..."
            : "Purchasing..."}
        </Button>
      </AnimatedBorder>
    );
  }

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (chainId !== CHAIN_CONFIG.id) return `Switch to ${CHAIN_CONFIG.name}`;
    return "Buy Streak Freeze";
  };

  return (
    <Button variant="primary" onClick={handleClick}>
      {getButtonText()}
    </Button>
  );
}

// --- Claim Earned Button ---

interface ClaimStreakFreezeButtonProps {
  mintId: number;
  walletAddress: string;
  nonce: `0x${string}`;
  signature: `0x${string}`;
  onClaim?: () => void;
  onError?: (error: string) => void;
}

export function ClaimStreakFreezeButton({
  mintId,
  walletAddress,
  nonce,
  signature,
  onClaim,
  onError,
}: ClaimStreakFreezeButtonProps) {
  const { isConnected, address, chainId } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: { enabled: !!hash },
  });

  const claimHandled = React.useRef(false);
  React.useEffect(() => {
    if (isSuccess && hash && !claimHandled.current) {
      claimHandled.current = true;
      // Notify backend that the claim tx went through
      fetch("/api/streak-freeze/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mintId, claimTxHash: hash }),
      })
        .then(() => onClaim?.())
        .catch((e) => onError?.(e.message));
      claimHandled.current = false;
    }
  }, [isSuccess, hash, mintId, onClaim, onError]);

  const handleClick = () => {
    try {
      claimHandled.current = false;

      if (!isConnected || !address) {
        connect({ connector: farcasterMiniApp() });
        return;
      }

      if (chainId !== CHAIN_CONFIG.id) {
        switchChain({ chainId: CHAIN_CONFIG.id });
        return;
      }

      writeContract({
        account: address,
        address: CONTRACT_ADDRESS,
        abi: STREAK_FREEZE_ABI,
        functionName: "claimEarned",
        args: [
          walletAddress as `0x${string}`,
          1n,
          nonce,
          signature,
        ],
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Something went wrong";
      onError?.(msg);
    }
  };

  if (isPending || isLoading) {
    return (
      <AnimatedBorder>
        <Button variant="primary" disabled>
          Claiming...
        </Button>
      </AnimatedBorder>
    );
  }

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (chainId !== CHAIN_CONFIG.id) return `Switch to ${CHAIN_CONFIG.name}`;
    return "Claim Streak Freeze";
  };

  return (
    <Button variant="primary" onClick={handleClick}>
      {getButtonText()}
    </Button>
  );
}

// --- Burn Button ---

interface BurnStreakFreezeButtonProps {
  gameKey: string;
  onBurn?: () => void;
  onError?: (error: string) => void;
}

export function BurnStreakFreezeButton({
  gameKey,
  onBurn,
  onError,
}: BurnStreakFreezeButtonProps) {
  const { isConnected, address, chainId } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: { enabled: !!hash },
  });

  // Read user's balance
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: STREAK_FREEZE_ABI,
    functionName: "balanceOf",
    args: address ? [address, STREAK_FREEZE_TOKEN_ID] : undefined,
    query: { enabled: !!address && !!CONTRACT_ADDRESS },
  });

  const burnHandled = React.useRef(false);
  React.useEffect(() => {
    if (isSuccess && hash && !burnHandled.current) {
      burnHandled.current = true;
      // Notify backend about the burn
      fetch("/api/streak-freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameKey, burnTxHash: hash }),
      })
        .then(() => onBurn?.())
        .catch((e) => onError?.(e.message));
      burnHandled.current = false;
    }
  }, [isSuccess, hash, gameKey, onBurn, onError]);

  const handleClick = () => {
    try {
      burnHandled.current = false;

      if (!isConnected || !address) {
        connect({ connector: farcasterMiniApp() });
        return;
      }

      if (chainId !== CHAIN_CONFIG.id) {
        switchChain({ chainId: CHAIN_CONFIG.id });
        return;
      }

      if (!balance || balance === 0n) {
        onError?.("No streak freezes available");
        return;
      }

      writeContract({
        account: address,
        address: CONTRACT_ADDRESS,
        abi: STREAK_FREEZE_ABI,
        functionName: "burn",
        args: [1n],
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Something went wrong";
      onError?.(msg);
    }
  };

  if (isPending || isLoading) {
    return (
      <AnimatedBorder>
        <Button variant="primary" disabled>
          Applying freeze...
        </Button>
      </AnimatedBorder>
    );
  }

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (chainId !== CHAIN_CONFIG.id) return `Switch to ${CHAIN_CONFIG.name}`;
    return "Use Streak Freeze";
  };

  return (
    <Button variant="primary" onClick={handleClick} disabled={!balance || balance === 0n}>
      {getButtonText()}
    </Button>
  );
}
