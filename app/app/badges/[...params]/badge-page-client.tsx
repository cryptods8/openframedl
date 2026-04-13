"use client";

import { useState } from "react";
import { ClipboardIcon, CheckIcon, ShareIcon } from "@heroicons/react/16/solid";
import { MintBadgeButton } from "@/app/ui/mint-badge-button";
import { useSharing } from "@/app/hooks/use-sharing";
import {
  BadgeCategory,
  BADGE_CATEGORIES,
  formatBadgeValue,
} from "@/app/lib/badges";

interface BadgePageClientProps {
  shareUrl: string;
  category?: string;
  milestone?: number;
  canMint?: boolean;
  minted?: boolean;
}

export function BadgePageClient({
  shareUrl,
  category,
  milestone,
  canMint,
  minted,
}: BadgePageClientProps) {
  const [copied, setCopied] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const { composeCast } = useSharing();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary-900/10 hover:bg-primary-900/15 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <ClipboardIcon className="w-4 h-4" />
              Copy link
            </>
          )}
        </button>

        {category && milestone && (
          <button
            type="button"
            onClick={() => {
              const cat = BADGE_CATEGORIES[category as BadgeCategory];
              const displayVal = formatBadgeValue(milestone);
              composeCast({
                text: `I earned my ${displayVal} ${cat?.label ?? category} badge in Framedl!`,
                embeds: [shareUrl],
              });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary-900/10 hover:bg-primary-900/15 transition-colors cursor-pointer"
          >
            <ShareIcon className="w-4 h-4" />
            Share
          </button>
        )}

        {canMint && category && milestone && !minted && !mintSuccess && (
          <MintBadgeButton
            category={category}
            milestone={milestone}
            size="sm"
            variant="outline"
            onMint={() => setMintSuccess(true)}
            onError={(err) => setMintError(err)}
          />
        )}
      </div>

      {minted && (
        <p className="text-xs text-primary-900/40">Minted as NFT</p>
      )}
      {mintSuccess && (
        <p className="text-xs text-green-600">Successfully minted as NFT!</p>
      )}
      {mintError && (
        <p className="text-xs text-red-500">{mintError}</p>
      )}
    </div>
  );
}
