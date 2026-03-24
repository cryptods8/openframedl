"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { NavLink } from "@/app/ui/nav-link";
import { isPro } from "@/app/constants";

export function ProfileTabs({ showBadges }: { showBadges?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab");

  function createHref(newTab?: string) {
    const params = new URLSearchParams();
    if (newTab) {
      params.set("tab", newTab);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex items-center gap-1 bg-primary-200/50 sm:rounded-full px-4 py-2 overflow-x-auto">
      <NavLink active={!tab} href={createHref()}>
        Games
      </NavLink>
      {!isPro && showBadges && (
        <NavLink active={tab === "badges"} href={createHref("badges")}>
          Badges
        </NavLink>
      )}
      <NavLink active={tab === "stats"} href={createHref("stats")}>
        Stats
      </NavLink>
      <NavLink active={tab === "settings"} href={createHref("settings")}>
        Settings
      </NavLink>
      {!isPro && (
        <NavLink active={tab === "freezes"} href={createHref("freezes")}>
          <div className="whitespace-nowrap">Streak Freezes</div>
        </NavLink>
      )}
    </div>
  );
}
