"use client";

import React from "react";
import { useAccount, useSwitchChain } from "wagmi";
import {
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { useWalletConnector } from "@/app/hooks/use-wallet-connector";
import { config } from "@/app/api/providers/wallet-provider";
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

export interface CollectableBadge {
  category: string;
  milestone: number;
}

interface CollectAllButtonProps {
  badges: CollectableBadge[];
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function CollectAllButton({
  badges,
  onComplete,
  onError,
}: CollectAllButtonProps) {
  const { isConnected, address, chainId } = useAccount();
  const { connectWallet } = useWalletConnector();
  const { switchChain } = useSwitchChain();

  const [isMinting, setIsMinting] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });

  if (!CONTRACT_ADDRESS || badges.length === 0) return null;

  const handleCollectAll = async () => {
    if (!isConnected || !address) {
      connectWallet();
      return;
    }

    if (chainId !== CHAIN_CONFIG.id) {
      switchChain({ chainId: CHAIN_CONFIG.id });
      return;
    }

    setIsMinting(true);
    setProgress({ current: 0, total: badges.length });

    let minted = 0;
    for (const badge of badges) {
      try {
        setProgress({ current: minted + 1, total: badges.length });

        // 1. Get signature from server
        const sigRes = await fetch(
          `/api/badges/mint?category=${badge.category}&milestone=${badge.milestone}&walletAddress=${address}`,
        );
        if (!sigRes.ok) {
          const err = await sigRes.json();
          if (err.error === "Badge already minted") {
            minted++;
            continue;
          }
          throw new Error(err.error || "Failed to get mint signature");
        }
        const { badgeId, nonce, signature, price } = await sigRes.json();

        // 2. Submit on-chain tx
        const hash = await writeContract(config, {
          account: address,
          address: CONTRACT_ADDRESS,
          abi: BADGE_NFT_ABI,
          functionName: "mintBadge",
          args: [address, badgeId, nonce, BigInt(price), signature],
          value: BigInt(price),
        });

        // 3. Wait for confirmation
        await waitForTransactionReceipt(config, { hash });

        // 4. Notify backend
        await fetch("/api/badges/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            badgeId,
            mintTxHash: hash,
            walletAddress: address,
          }),
        });

        minted++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        onError?.(`Failed on badge ${minted + 1}/${badges.length}: ${msg}`);
        setIsMinting(false);
        if (minted > 0) onComplete?.();
        return;
      }
    }

    setIsMinting(false);
    onComplete?.();
  };

  if (isMinting) {
    return (
      <AnimatedBorder>
        <Button variant="primary" size="sm" disabled>
          Minting {progress.current}/{progress.total}...
        </Button>
      </AnimatedBorder>
    );
  }

  if (!isConnected) {
    return (
      <Button variant="primary" size="sm" onClick={handleCollectAll}>
        Connect Wallet
      </Button>
    );
  }

  if (chainId !== CHAIN_CONFIG.id) {
    return (
      <Button variant="primary" size="sm" onClick={handleCollectAll}>
        Switch to {CHAIN_CONFIG.name}
      </Button>
    );
  }

  return (
    <Button variant="primary" size="sm" onClick={handleCollectAll}>
      Collect All ({badges.length})
    </Button>
  );
}
