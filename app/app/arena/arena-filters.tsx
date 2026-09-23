"use client";

import { useEffect, useState } from "react";
import { useFarcasterSession } from "@/app/hooks/use-farcaster-session";
import { ArenaFilter } from "@/app/api/arenas/list/route";
import { NavLink } from "@/app/ui/nav-link";
import { usePathname, useSearchParams } from "next/navigation";

interface ArenaFiltersProps {
  currentFilter: ArenaFilter;
  inProgressCount?: number;
}

export function ArenaFilters({
  currentFilter,
  inProgressCount: initialCount,
}: ArenaFiltersProps) {
  const { status } = useFarcasterSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [inProgressCount, setInProgressCount] = useState<number | undefined>(
    initialCount,
  );

  useEffect(() => {
    if (status !== "authenticated") {
      setInProgressCount(0);
      return;
    }
    let cancelled = false;
    fetch("/api/arenas/in-progress-count")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && typeof data.count === "number") {
          setInProgressCount(data.count);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, pathname]);

  function createHref(filterType: string) {
    const params = new URLSearchParams(searchParams);
    params.set("ft", filterType);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-1 bg-primary-200/50 sm:rounded-full px-4 py-2 overflow-x-auto">
      {status === "authenticated" && (
        <NavLink
          href={createHref("in_progress")}
          active={currentFilter === "in_progress"}
        >
          <span className="inline-flex items-center gap-1.5">
            <span>In Progress</span>
            {inProgressCount !== undefined && inProgressCount > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-4 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  currentFilter === "in_progress"
                    ? "bg-amber-400 text-amber-950"
                    : "bg-amber-500 text-white"
                }`}
              >
                {inProgressCount}
              </span>
            )}
          </span>
        </NavLink>
      )}
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
      <NavLink href={createHref("open")} active={currentFilter === "open"}>
        Open
      </NavLink>
      <NavLink href={createHref("past")} active={currentFilter === "past"}>
        Past
      </NavLink>
    </div>
  );
}
