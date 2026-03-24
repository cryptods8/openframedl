"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavVisibility } from "@/app/contexts/nav-visibility-context";
import { useSafeAreaInsets } from "@/app/contexts/safe-area-context";
import {
  HomeIcon as HomeOutline,
  TrophyIcon as TrophyOutline,
  BoltIcon as BoltOutline,
  PencilSquareIcon as PencilOutline,
  UserCircleIcon as UserOutline,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  TrophyIcon as TrophySolid,
  BoltIcon as BoltSolid,
  PencilSquareIcon as PencilSolid,
  UserCircleIcon as UserSolid,
} from "@heroicons/react/24/solid";
import { UserKey } from "../game/game-repository";
import { useFarcasterSession } from "../hooks/use-farcaster-session";

export const BOTTOM_NAV_HEIGHT = 56;

export function useBottomOffset() {
  const { isNavVisible } = useNavVisibility();
  const { insets } = useSafeAreaInsets();
  return insets.bottom + (isNavVisible ? BOTTOM_NAV_HEIGHT : 0);
}

const NAV_ITEMS = [
  {
    href: "/app/v2",
    label: "Daily",
    OutlineIcon: HomeOutline,
    SolidIcon: HomeSolid,
    match: (p: string) => p === "/app/v2" || p.startsWith("/app/v2?"),
  },
  {
    href: "/app/leaderboard",
    createHref: (userKey?: UserKey) =>
      userKey
        ? `/app/leaderboard?uid=${userKey.userId}&ip=${userKey.identityProvider}`
        : "/app/leaderboard",
    label: "Scores",
    OutlineIcon: TrophyOutline,
    SolidIcon: TrophySolid,
    match: (p: string) => p.startsWith("/app/leaderboard"),
  },
  {
    href: "/app/arena",
    label: "Arenas",
    OutlineIcon: BoltOutline,
    SolidIcon: BoltSolid,
    match: (p: string) => p.startsWith("/app/arena"),
  },
  {
    href: "/app/custom/create",
    label: "Custom",
    OutlineIcon: PencilOutline,
    SolidIcon: PencilSolid,
    match: (p: string) => p.startsWith("/app/custom"),
  },
  {
    href: "/app/profile",
    label: "Profile",
    OutlineIcon: UserOutline,
    SolidIcon: UserSolid,
    match: (p: string) =>
      p.startsWith("/app/profile") || p.startsWith("/app/streak-freezes"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isNavVisible } = useNavVisibility();
  const { insets } = useSafeAreaInsets();
  const { session } = useFarcasterSession();
  const userKey =
    session?.user?.fid != null
      ? ({ userId: session.user.fid, identityProvider: "fc" } as const)
      : undefined;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-t border-primary-200/80 transition-transform duration-300 ease-in-out ${
        isNavVisible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: insets.bottom }}
    >
      <div className="flex items-stretch h-14 max-w-lg mx-auto">
        {NAV_ITEMS.map(
          ({ href, createHref, label, OutlineIcon, SolidIcon, match }) => {
            const active = match(pathname);
            const Icon = active ? SolidIcon : OutlineIcon;
            const actualHref = createHref ? createHref(userKey) : href;
            return (
              <Link
                key={actualHref}
                href={actualHref}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                  active
                    ? "text-primary-800"
                    : "text-primary-900/40 hover:text-primary-900/60"
                }`}
              >
                <Icon className="size-6 shrink-0" />
                <span
                  className={`text-[10px] font-medium leading-none ${active ? "font-semibold" : ""}`}
                >
                  {label}
                </span>
              </Link>
            );
          },
        )}
      </div>
    </nav>
  );
}
