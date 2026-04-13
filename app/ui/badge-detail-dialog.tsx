"use client";

import { useCallback, useState } from "react";
import {
  BadgeInfo,
  BADGE_CATEGORIES,
  TIER_MINT_PRICES,
  formatBadgeValue,
  getBadgeImageUrl,
} from "@/app/lib/badges";
import { CheckCircleIcon, ShareIcon } from "@heroicons/react/16/solid";
import { Button } from "./button/button";
import { Dialog } from "./dialog";
import { MintBadgeButton } from "./mint-badge-button";
import { useSharing } from "@/app/hooks/use-sharing";
import { externalBaseUrl } from "@/app/constants";

export interface DisplayBadge extends BadgeInfo {
  dbId?: string;
  username?: string | null;
  minted?: boolean;
  earnedAt?: string;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "text-amber-700",
  silver: "text-gray-400",
  gold: "text-yellow-500",
  platinum: "text-blue-300",
  diamond: "text-cyan-400",
};

export function BadgeDetailDialog({
  badge,
  open,
  onClose,
  onCollected,
  canCollect,
}: {
  badge: DisplayBadge | null;
  open: boolean;
  onClose: () => void;
  onCollected?: () => void;
  canCollect?: boolean;
}) {
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const { composeCast } = useSharing();

  const imageUrl = badge
    ? getBadgeImageUrl(badge.category, badge.milestone, badge.username)
    : "";
  const catInfo = badge ? BADGE_CATEGORIES[badge.category] : null;
  const displayValue = badge ? formatBadgeValue(badge.milestone) : "";
  const isMinted = badge?.minted || mintSuccess;

  const handleClose = useCallback(() => {
    setMintSuccess(false);
    setMintError(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose}>
      {badge && catInfo && (
        <div className="flex flex-col items-center gap-4 w-64 min-[400px]:w-80">
          {/* Badge image */}
          <div className="w-full aspect-square rounded-lg overflow-hidden shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`${displayValue} ${catInfo.label}`}
              className="w-full h-full"
            />
          </div>

          {/* Badge info */}
          <div className="text-center">
            <h2 className="text-xl font-space font-bold">
              {displayValue} {catInfo.label}
            </h2>
            <p
              className={`text-sm font-semibold capitalize ${TIER_COLORS[badge.tier] ?? ""}`}
            >
              {badge.tier} tier
            </p>
            {badge.earnedAt && (
              <p className="text-xs text-primary-900/50 mt-2">
                {new Date(badge.earnedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Minted status / mint action */}
          <div className="w-full space-y-2">
            {canCollect && (
              <div className="w-full space-y-2">
                {isMinted ? (
                  <div className="flex items-center justify-center gap-1.5 text-sm text-green-600 py-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    Collected
                  </div>
                ) : (
                  <MintBadgeButton
                    category={badge.category}
                    milestone={badge.milestone}
                    variant="primary"
                    size="md"
                    onMint={() => {
                      setMintSuccess(true);
                      setMintError(null);
                      onCollected?.();
                    }}
                    onError={(err: string) => setMintError(err)}
                  >
                    Collect as NFT
                  </MintBadgeButton>
                )}
                {mintError && (
                  <p className="text-xs text-red-500 text-center">
                    {mintError}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!badge || !catInfo) return;
                  const shareUrl = badge.dbId
                    ? `${externalBaseUrl}/app/badges/${badge.dbId}`
                    : `${externalBaseUrl}/app/badges/${badge.category}/${badge.milestone}`;
                  const displayVal = formatBadgeValue(badge.milestone);
                  composeCast({
                    text: `I earned my ${displayVal} ${catInfo.label} badge in Framedl!`,
                    embeds: [shareUrl],
                  });
                }}
              >
                <ShareIcon className="w-4 h-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close
              </Button>
            </div>
            {canCollect && !isMinted && (
              <p className="text-xs text-primary-900/50 text-center">
                {TIER_MINT_PRICES[badge.tier] === 0n
                  ? `Free to collect for ${badge.tier} tier`
                  : `Collecting costs ${Number(TIER_MINT_PRICES[badge.tier]) / 1e18}Ξ`}
              </p>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
