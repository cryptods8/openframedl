import type { GameIdentityProvider } from "@/app/game/game-repository";

// TODO: remove once badges are released to all users
const ALLOWLIST = new Set<string>(["fc:11124"]);

export function isBadgeAccessUser(
  userId: string | undefined | null,
  identityProvider: GameIdentityProvider | string | undefined | null,
): boolean {
  if (!userId || !identityProvider) return false;
  return ALLOWLIST.has(`${identityProvider}:${userId}`);
}
