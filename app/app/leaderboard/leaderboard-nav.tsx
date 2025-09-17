"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathname } from "next/navigation";
import { NavLink } from "@/app/ui/nav-link";

export function LeaderboardNav({ activeType }: { activeType: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function createHref(type: string) {
    const params = new URLSearchParams(searchParams);
    params.set("type", type);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-1 bg-primary-200/50 sm:rounded-full px-4 sm:px-2 py-2">
      <NavLink href={createHref("SCORE")} active={activeType === "SCORE"}>Score</NavLink>
      <NavLink href={createHref("GAMES_WON")} active={activeType === "GAMES_WON"}>Wins</NavLink>
      <NavLink href={createHref("STREAK")} active={activeType === "STREAK"}>Streaks</NavLink>
    </div>
  );
}