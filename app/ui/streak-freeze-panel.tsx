"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ClaimStreakFreezeButton,
  PurchaseStreakFreezeButton,
  BurnMultipleStreakFreezeButton,
} from "./streak-freeze-button";
import { toast } from "./toasts/toast";
import { SnowFlakeIcon } from "../image-ui/icons/SnowFlakeIcon";

interface PendingClaim {
  id: number;
  walletAddress: string;
  nonce: string;
  signature: string;
  streakLength: number | null;
  gameKey: string | null;
}

interface StreakFreezeData {
  available: number;
  applied: unknown[];
  pendingClaims: PendingClaim[];
  gaps: string[];
}

export function StreakFreezePanel() {
  const { data, isLoading, refetch } = useQuery<StreakFreezeData>({
    queryKey: ["streak-freeze"],
    queryFn: () => fetch("/api/streak-freeze").then((res) => res.json()),
  });

  const available = data?.available ?? 0;
  const pendingClaims = data?.pendingClaims ?? [];
  const gaps = data?.gaps ?? [];

  // Cap consecutive gap groups at 7 for the burn call
  const protectableGaps = gaps.slice(0, 7);

  const handleRefetch = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-primary-950/5 rounded-md" />
        <div className="h-24 bg-primary-950/5 rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance display */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-md">
        <div className="size-6 text-blue-600">
          <SnowFlakeIcon />
        </div>
        <div>
          <span className="font-semibold font-space text-lg">{available}</span>
          <span className="text-primary-950/60 ml-1">available</span>
          {pendingClaims.length > 0 && (
            <span className="text-primary-950/40 ml-2">
              + {pendingClaims.length} pending claim
              {pendingClaims.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Pending Claims */}
      {pendingClaims.length > 0 && (
        <div>
          <h3 className="font-space font-semibold text-sm text-primary-950/60 uppercase tracking-wide mb-2">
            Pending Claims
          </h3>
          <div className="space-y-2">
            {pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-3 bg-primary-950/5 rounded-md"
              >
                <span className="text-sm">
                  Earned at streak {claim.streakLength}
                </span>
                <ClaimStreakFreezeButton
                  mintId={claim.id}
                  walletAddress={claim.walletAddress}
                  nonce={claim.nonce as `0x${string}`}
                  signature={claim.signature as `0x${string}`}
                  onClaim={() => {
                    toast("Streak freeze claimed!");
                    handleRefetch();
                  }}
                  onError={(err) => toast(err)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase */}
      <div>
        <h3 className="font-space font-semibold text-sm text-primary-950/60 uppercase tracking-wide mb-2">
          Get More Freezes
        </h3>
        <div className="p-3 bg-primary-950/5 rounded-md">
          <PurchaseStreakFreezeButton
            onPurchase={() => {
              toast("Streak freeze purchased!");
              handleRefetch();
            }}
            onError={(err) => toast(err)}
          />
        </div>
      </div>

      {/* Protect My Streak */}
      {gaps.length > 0 && (
        <div>
          <h3 className="font-space font-semibold text-sm text-primary-950/60 uppercase tracking-wide mb-2">
            Protect My Streak
          </h3>
          <div className="p-4 bg-primary-950/5 rounded-md space-y-3">
            <p className="text-sm text-primary-950/70">
              You have{" "}
              <span className="font-semibold">{gaps.length} unprotected</span>{" "}
              day{gaps.length !== 1 ? "s" : ""} in your streak:
            </p>
            <div className="flex flex-wrap gap-1">
              {gaps.map((date) => (
                <span
                  key={date}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded"
                >
                  {date}
                </span>
              ))}
            </div>
            <div className="text-sm text-primary-950/50">
              {protectableGaps.length} freeze
              {protectableGaps.length !== 1 ? "s" : ""} needed
              {" / "}
              {available} available
              {gaps.length > 7 && (
                <span className="text-amber-600 ml-1">
                  (max 7 consecutive per transaction)
                </span>
              )}
            </div>
            <BurnMultipleStreakFreezeButton
              gameKeys={protectableGaps}
              onBurn={() => {
                toast("Streak protected!");
                handleRefetch();
              }}
              onError={(err) => toast(err)}
            />
          </div>
        </div>
      )}

      {gaps.length === 0 && (
        <div className="text-sm text-primary-950/40 text-center py-2">
          Your streak is fully protected!
        </div>
      )}
    </div>
  );
}
