"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  children,
  active,
}: React.PropsWithChildren<{ href: string; active: boolean }>) {
  return (
    <Link
      href={href}
      className={`text-center rounded-full font-semibold px-4 py-2.5 text-sm transition duration-150 ease-in-out ${
        active ? "bg-primary-800 text-white" : "text-primary-800/90 hover:bg-primary-200 hover:text-primary-800/90"
      }`}
    >
      {children}
    </Link>
  );
}

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