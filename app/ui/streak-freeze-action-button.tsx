"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { SnowFlakeIcon } from "../image-ui/icons/SnowFlakeIcon";
import { Button } from "./button/button";

interface StreakFreezeActionButtonProps {
  enabled: boolean;
  onClick: () => void;
}

export function StreakFreezeActionButton({
  enabled,
  onClick,
}: StreakFreezeActionButtonProps) {
  const { address } = useAccount();

  const { data } = useQuery<{
    pendingClaims: unknown[];
    gaps: unknown[];
  }>({
    queryKey: ["streak-freeze", address],
    queryFn: () => {
      const url = address
        ? `/api/streak-freeze?walletAddress=${address}`
        : "/api/streak-freeze";
      return fetch(url).then((res) => res.json());
    },
    enabled,
  });

  const hasPendingClaims = (data?.pendingClaims?.length ?? 0) > 0;
  const hasGaps = (data?.gaps?.length ?? 0) > 0;

  if (!hasPendingClaims && !hasGaps) {
    return null;
  }

  const label = hasPendingClaims
    ? "Claim Streak Freeze"
    : "Protect your streak";

  return (
    <div className="flex flex-col items-center mt-4 space-y-6">
      <Button
        onClick={onClick}
        variant="outline"
        size="sm"
        // className="flex items-center gap-1 text-xs font-semibold text-primary-900/80 transition-colors"
      >
        <div className="size-5 text-blue-500">
          <SnowFlakeIcon />
        </div>
        {label}
      </Button>

      <div className="rounded-full h-1.5 w-16 bg-primary-900/10" />
    </div>
  );
}
