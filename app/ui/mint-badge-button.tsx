"use client";

import React from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { useWalletConnector } from "@/app/hooks/use-wallet-connector";
import { AnimatedBorder } from "./animated-border";
import { Button } from "./button/button";
import {
  BADGE_NFT_ABI,
  BADGE_NFT_CONTRACT_ADDRESS,
  BADGE_NFT_CHAIN_ID,
} from "../lib/badge-nft-contract";

const CONTRACT_ADDRESS = BADGE_NFT_CONTRACT_ADDRESS as `0x${string}`;
const CHAIN_ID = BADGE_NFT_CHAIN_ID;

const CHAIN_CONFIGS: Record<string, { id: number; name: string }> = {
  "84532": { id: 84532, name: "Base Sepolia" },
  "8453": { id: 8453, name: "Base" },
};
const CHAIN_CONFIG = CHAIN_CONFIGS[String(CHAIN_ID)] || {
  id: CHAIN_ID,
  name: "Unknown",
};

interface MintBadgeButtonProps {
  category: string;
  milestone: number;
  onMint?: (tokenId: string) => void;
  onError?: (error: string) => void;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline";
  children?: React.ReactNode;
}

export function MintBadgeButton({
  category,
  milestone,
  onMint,
  onError,
  variant = "primary",
  size = "sm",
  children,
}: MintBadgeButtonProps) {
  const { isConnected, address, chainId } = useAccount();
  const { connectWallet } = useWalletConnector();
  const { switchChain } = useSwitchChain();

  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    query: { enabled: !!hash },
  });

  const [isSigning, setIsSigning] = React.useState(false);
  const [isBackendSyncing, setIsBackendSyncing] = React.useState(false);
  const mintHandled = React.useRef(false);
  const resolvedBadgeId = React.useRef<string | null>(null);

  // After on-chain tx succeeds, notify backend
  React.useEffect(() => {
    if (isSuccess && hash && !mintHandled.current) {
      mintHandled.current = true;
      setIsBackendSyncing(true);
      fetch("/api/badges/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badgeId: resolvedBadgeId.current,
          mintTxHash: hash,
          walletAddress: address,
        }),
      })
        .then((res) => {
          if (!res.ok) return res.json().then((d) => { throw new Error(d.error); });
          return res.json();
        })
        .then((data) => onMint?.(data.tokenId))
        .catch((e) => onError?.(e.message))
        .finally(() => setIsBackendSyncing(false));
    }
  }, [isSuccess, hash, address, onMint, onError]);

  const handleClick = async () => {
    try {
      mintHandled.current = false;

      if (!isConnected || !address) {
        connectWallet();
        return;
      }

      if (chainId !== CHAIN_CONFIG.id) {
        switchChain({ chainId: CHAIN_CONFIG.id });
        return;
      }

      // 1. Get signature from server (materializes badge if needed)
      setIsSigning(true);
      const sigRes = await fetch(
        `/api/badges/mint?category=${category}&milestone=${milestone}&walletAddress=${address}`,
      );
      if (!sigRes.ok) {
        const err = await sigRes.json();
        throw new Error(err.error || "Failed to get mint signature");
      }
      const { badgeId, nonce, signature, price } = await sigRes.json();
      resolvedBadgeId.current = badgeId;
      setIsSigning(false);

      // 2. Submit on-chain tx
      writeContract({
        account: address,
        address: CONTRACT_ADDRESS,
        abi: BADGE_NFT_ABI,
        functionName: "mintBadge",
        args: [address, badgeId, nonce, BigInt(price), signature],
        value: BigInt(price),
      });
    } catch (error) {
      setIsSigning(false);
      const msg =
        error instanceof Error ? error.message : "Something went wrong";
      onError?.(msg);
    }
  };

  const isBusy = isSigning || isPending || isLoading || isBackendSyncing;

  if (!CONTRACT_ADDRESS) return null;

  if (isBusy) {
    return (
      <AnimatedBorder>
        <Button variant={variant} size={size} disabled>
          {isSigning
            ? "Preparing..."
            : isBackendSyncing
              ? "Finalizing..."
              : "Minting..."}
        </Button>
      </AnimatedBorder>
    );
  }

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (chainId !== CHAIN_CONFIG.id) return `Switch to ${CHAIN_CONFIG.name}`;
    return children || "Mint as NFT";
  };

  return (
    <Button variant={variant} size={size} onClick={handleClick}>
      {getButtonText()}
    </Button>
  );
}
