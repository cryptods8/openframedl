"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { NavLink } from "@/app/ui/nav-link";
import { getCurrentTab } from "./profile-utils";

export function ProfileTabs({
  showBadges = false,
  isPro,
}: {
  showBadges?: boolean;
  isPro: boolean;
}) {
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

  const currentTab = getCurrentTab(tab, showBadges, isPro);

  return (
    <div className="flex items-center gap-1 bg-primary-200/50 sm:rounded-full px-4 py-2 overflow-x-auto">
      {!isPro && showBadges && (
        <NavLink active={currentTab === "badges"} href={createHref("badges")}>
          Badges
        </NavLink>
      )}
      {!isPro && (
        <NavLink active={currentTab === "freezes"} href={createHref("freezes")}>
          <div className="whitespace-nowrap">Freezes</div>
        </NavLink>
      )}
      <NavLink active={currentTab === "games"} href={createHref("games")}>
        Games
      </NavLink>
      <NavLink active={currentTab === "stats"} href={createHref("stats")}>
        Stats
      </NavLink>
      <NavLink active={currentTab === "settings"} href={createHref("settings")}>
        Settings
      </NavLink>
    </div>
  );
}
