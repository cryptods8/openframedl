"use client";

import { useFarcasterSession } from "@/app/hooks/use-farcaster-session";
import { ArenaFilter } from "@/app/api/arenas/list/route";
import { NavLink } from "@/app/ui/nav-link";
import { usePathname, useSearchParams } from "next/navigation";

interface ArenaFiltersProps {
  currentFilter: ArenaFilter;
}

export function ArenaFilters({ currentFilter }: ArenaFiltersProps) {
  const { status } = useFarcasterSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function createHref(filterType: string) {
    const params = new URLSearchParams(searchParams);
    params.set("ft", filterType);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-1 bg-primary-200/50 sm:rounded-full px-4 py-2">
      <NavLink href={createHref("open")} active={currentFilter === "open"}>
        Open
      </NavLink>
      <NavLink href={createHref("past")} active={currentFilter === "past"}>
        Past
      </NavLink>
      <NavLink href={createHref("upcoming")} active={currentFilter === "upcoming"}>
        Upcoming
      </NavLink>
      {status === "authenticated" && (
        <NavLink
          href={createHref("playable")}
          active={currentFilter === "playable"}
        >
          Playable
        </NavLink>
      )}
      {status === "authenticated" && (
        <NavLink href={createHref("mine")} active={currentFilter === "mine"}>
          Mine
        </NavLink>
      )}
    </div>
  );
}
