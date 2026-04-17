"use client";

import { useState } from "react";
import {
  ClipboardIcon,
  CheckIcon,
  ShareIcon,
  CheckBadgeIcon,
} from "@heroicons/react/16/solid";
import { MintBadgeButton } from "@/app/ui/mint-badge-button";
import { Button } from "@/app/ui/button/button";
import { useSharing } from "@/app/hooks/use-sharing";
import { useMiniAppAutoSignIn } from "@/app/hooks/use-miniapp-auto-signin";
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
  const { isAuthenticated, signingIn } = useMiniAppAutoSignIn();
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

  const showMint =
    canMint && category && milestone && !minted && !mintSuccess;
  const showMintedStatus = minted || mintSuccess;
  const myBadgesVariant = showMint ? "outline" : "primary";

  return (
    <div
      className="flex flex-col items-stretch gap-3"
      aria-live="polite"
    >
      {showMint && (
        <MintBadgeButton
          category={category!}
          milestone={milestone!}
          size="md"
          variant="primary"
          onMint={() => setMintSuccess(true)}
          onError={(err) => setMintError(err)}
        >
          Collect as NFT
        </MintBadgeButton>
      )}

      {showMintedStatus && (
        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-green-600">
          <CheckBadgeIcon className="w-4 h-4" aria-hidden="true" />
          {mintSuccess ? "Successfully collected as NFT" : "Collected as NFT"}
        </div>
      )}

      {isAuthenticated && (
        <Button
          href="/app/profile?tab=badges"
          variant={myBadgesVariant}
          size="md"
        >
          View My Badges
        </Button>
      )}
      {signingIn && !isAuthenticated && (
        <p className="text-center text-xs text-primary-900/50">
          Signing you in…
        </p>
      )}

      <div className="flex gap-2 justify-center pt-1">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Link copied" : "Copy link to badge"}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary-900/5 hover:bg-primary-900/10 active:bg-primary-900/15 text-primary-900/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          style={{ touchAction: "manipulation" }}
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <ClipboardIcon className="w-4 h-4" aria-hidden="true" />
              Copy Link
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
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary-900/5 hover:bg-primary-900/10 active:bg-primary-900/15 text-primary-900/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            style={{ touchAction: "manipulation" }}
          >
            <ShareIcon className="w-4 h-4" aria-hidden="true" />
            Share
          </button>
        )}
      </div>

      {mintError && (
        <p className="text-xs text-red-500 text-center">{mintError}</p>
      )}
    </div>
  );
}
