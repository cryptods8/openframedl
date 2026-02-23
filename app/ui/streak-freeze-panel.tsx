"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import {
  ClaimStreakFreezeButton,
  PurchaseStreakFreezeButton,
  BurnMultipleStreakFreezeButton,
} from "./streak-freeze-button";
import { toast } from "./toasts/toast";
import { SnowFlakeIcon } from "../image-ui/icons/SnowFlakeIcon";
import { PanelTitle } from "./panel-title";

const MINT_PRICE =
  process.env.NEXT_PUBLIC_STREAK_FREEZE_NFT_MINT_PRICE || "0.0025";

interface PendingClaim {
  id: number;
  walletAddress: string;
  nonce: string;
  signature: string;
  streakLength: number | null;
  gameKey: string | null;
}

interface StreakGap {
  startDate: string;
  endDate: string;
  length: number;
  dates: string[];
}

interface StreakFreezeData {
  available: number;
  applied: unknown[];
  pendingClaims: PendingClaim[];
  gaps: StreakGap[];
}

export function StreakFreezePanel() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useQuery<StreakFreezeData>({
    queryKey: ["streak-freeze", address],
    queryFn: () => {
      const url = address
        ? `/api/streak-freeze?walletAddress=${address}`
        : "/api/streak-freeze";
      return fetch(url).then((res) => res.json());
    },
  });

  const available = data?.available ?? 0;
  const pendingClaims = data?.pendingClaims ?? [];
  const gaps = data?.gaps ?? [];

  const [selectedGapIndex, setSelectedGapIndex] = useState(0);
  const [showAllClaims, setShowAllClaims] = useState(false);

  const handleRefetch = () => {
    refetch();
  };

  const selectedGap = gaps[selectedGapIndex];
  const selectedGapLength = selectedGap?.length ?? 0;

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
      <div className="">
        <div className="flex items-center gap-3 p-4 bg-primary-100 rounded-md">
          <div className="size-6 text-blue-500">
            <SnowFlakeIcon />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-lg">{available}</span>
            <span className="text-primary-900/60 ml-1">available</span>
          </div>
          <div>
            <PurchaseStreakFreezeButton
              variant="outline"
              size="sm"
              onPurchase={() => {
                toast("Streak Freeze purchased!");
                handleRefetch();
              }}
              onError={(err) => toast(err)}
            >
              Buy more
            </PurchaseStreakFreezeButton>
          </div>
        </div>
        <div className="text-primary-900/50 mt-2 text-xs text-center">
          Earn one for every 100-day streak or buy for {MINT_PRICE}Ξ
        </div>
      </div>

      {/* Pending Claims */}
      {pendingClaims.length > 0 && (
        <div>
          <PanelTitle className="mb-2">Pending Claims</PanelTitle>
          <div className="bg-primary-100 rounded-md overflow-hidden">
            {(showAllClaims ? pendingClaims : pendingClaims.slice(0, 2)).map(
              (claim) => (
                <div
                  key={claim.id}
                  className="flex items-center gap-3 p-3 border-b border-primary-200 last:border-b-0"
                >
                  <div className="text-sm flex-1 pl-2">
                    <div>
                      Earned at streak{" "}
                      <span className="font-semibold">
                        {claim.streakLength}
                      </span>
                    </div>
                    <div className="text-xs text-primary-900/60">
                      {claim.gameKey}
                    </div>
                  </div>
                  <div>
                    <ClaimStreakFreezeButton
                      mintId={claim.id}
                      walletAddress={claim.walletAddress}
                      nonce={claim.nonce as `0x${string}`}
                      signature={claim.signature as `0x${string}`}
                      onClaim={() => {
                        toast("Streak Freeze claimed!");
                        handleRefetch();
                      }}
                      onError={(err) => toast(err)}
                      variant="outline"
                      size="sm"
                    >
                      Claim
                    </ClaimStreakFreezeButton>
                  </div>
                </div>
              ),
            )}
            {pendingClaims.length > 2 && !showAllClaims && (
              <button
                onClick={() => setShowAllClaims(true)}
                className="w-full py-2.5 text-sm text-primary-900/80 font-semibold hover:bg-primary-200/50 transition-colors flex items-center justify-center"
              >
                Show {pendingClaims.length - 2} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* Protect My Streak */}
      {gaps.length > 0 && (
        <div>
          <PanelTitle className="mb-2">Protect My Streak</PanelTitle>
          <div className="bg-primary-100 rounded-md max-h-48 overflow-y-auto">
            {gaps.map((gap, index) => {
              const isSelected = selectedGapIndex === index;
              return (
                <label
                  key={`${gap.startDate}-${gap.endDate}`}
                  className={`flex items-start gap-3 p-4 border-b border-primary-300/50 cursor-pointer last:border-b-0 transition-colors hover:bg-primary-200/75 ${
                    isSelected ? "bg-primary-200/75" : ""
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="streak-gap"
                      className="size-4 text-primary-600 focus:ring-primary-600 border-primary-950/20"
                      checked={isSelected}
                      onChange={() => setSelectedGapIndex(index)}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-primary-900/80">
                      {gap.startDate === gap.endDate
                        ? gap.startDate
                        : `${gap.startDate} to ${gap.endDate}`}
                    </div>
                    <div className="text-sm text-primary-900/50">
                      Requires {gap.length} Freeze
                      {gap.length !== 1 ? "s" : ""} to protect ({gap.length}{" "}
                      missing day{gap.length !== 1 ? "s" : ""})
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-4">
            {available >= selectedGapLength ? (
              <div className="space-y-2">
                <BurnMultipleStreakFreezeButton
                  gameKeys={selectedGap?.dates ?? []}
                  onBurn={() => {
                    toast("Streak protected!");
                    handleRefetch();
                  }}
                  onError={(err) => toast(err)}
                >
                  Protect My Streak
                </BurnMultipleStreakFreezeButton>
                <div className="text-center text-xs text-primary-900/50">
                  Uses {selectedGapLength} Freeze
                  {selectedGapLength !== 1 ? "s" : ""}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <PurchaseStreakFreezeButton
                  variant="primary"
                  onPurchase={() => {
                    toast("Streak Freeze purchased!");
                    handleRefetch();
                  }}
                  onError={(err) => toast(err)}
                >
                  Buy {selectedGapLength - available} Freeze
                  {selectedGapLength - available !== 1 ? "s" : ""}
                </PurchaseStreakFreezeButton>
                <div className="text-center text-xs text-primary-900/50">
                  Need {selectedGapLength - available} more Freeze
                  {selectedGapLength - available !== 1 ? "s" : ""} to cover this
                  gap
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {gaps.length === 0 && (
        <div className="text-sm text-primary-900/40 text-center py-2">
          Your streak is fully protected!
        </div>
      )}
    </div>
  );
}
