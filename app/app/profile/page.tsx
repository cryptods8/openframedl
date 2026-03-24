import { Suspense } from "react";
import { ProfileApp } from "@/app/profiles/profile-app";
import { SignIn } from "@/app/ui/auth/sign-in";
import { SettingsPanel } from "@/app/ui/settings-panel";
import { StreakFreezePanel } from "@/app/ui/streak-freeze-panel";
import { isPro } from "@/app/constants";
import { ProfileTabs } from "./profile-tabs";
import { ProfileContent } from "./profile-content";
import { ProfilePageWrapper } from "./profile-page-wrapper";
import ProfileGameStats from "@/app/profiles/profile-game-stats";
import { ProfileHeaderFromSession } from "./profile-header-from-session";
import { getFarcasterSession } from "@/app/lib/auth";
import { ProfileBadges } from "./profile-badges";
import { gameService } from "@/app/game/game-service";
import * as badgeRepo from "@/app/game/badge-pg-repository";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab, gt } = await searchParams;

  return (
    <div className="w-full h-dvh min-h-full">
      <ProfileApp headerless>
        <div className="min-w-72 max-w-2xl mx-auto px-0 sm:px-4">
          <div className="flex items-center justify-between p-4 sm:p-6 gap-3">
            <div className="flex-1">
              <Suspense
                fallback={
                  <div className="font-space text-lg min-[360px]:text-xl font-semibold">
                    Framedl
                  </div>
                }
              >
                <ProfileHeaderFromSession />
              </Suspense>
            </div>
            <SignIn />
          </div>

          <Suspense>
            <ProfileTabs />
          </Suspense>

          <ProfilePageWrapper>
            {!tab && (
              <div className="pt-2">
                <Suspense
                  fallback={
                    <div className="text-center text-primary-900/60 p-8">
                      Loading...
                    </div>
                  }
                >
                  <ProfileContent gameType={gt as string | undefined} />
                </Suspense>
              </div>
            )}

            {tab === "stats" && (
              <div className="sm:pt-2">
                <Suspense
                  fallback={
                    <div className="text-center text-primary-900/60 p-8">
                      Loading...
                    </div>
                  }
                >
                  <ProfileStatsContent />
                </Suspense>
              </div>
            )}

            {tab === "badges" && (
              <div className="sm:p-4">
                <Suspense
                  fallback={
                    <div className="text-center text-primary-900/60 p-8">
                      Loading...
                    </div>
                  }
                >
                  <ProfileBadgesContent />
                </Suspense>
              </div>
            )}

            {tab === "settings" && (
              <div className="sm:p-4">
                <div className="p-4 sm:p-6 bg-white sm:rounded-lg">
                  <SettingsPanel />
                </div>
              </div>
            )}

            {tab === "freezes" && !isPro && (
              <div className="sm:p-4">
                <div className="p-4 sm:p-6 bg-white sm:rounded-lg">
                  <StreakFreezePanel />
                </div>
              </div>
            )}
          </ProfilePageWrapper>
        </div>
      </ProfileApp>
    </div>
  );
}

async function ProfileBadgesContent() {
  const session = await getFarcasterSession();
  const user = session?.user;

  if (!user?.fid) {
    return (
      <div className="text-center text-primary-900/60 p-8 space-y-4">
        <p>Sign in to view your badges</p>
        <div className="flex justify-center">
          <SignIn />
        </div>
      </div>
    );
  }

  const userKey = {
    identityProvider: "fc" as const,
    userId: user.fid,
  };

  const [dbBadges, stats] = await Promise.all([
    badgeRepo.findByUserKey(userKey),
    gameService.loadStats(userKey),
  ]);

  if (!stats) {
    return (
      <div className="text-center text-primary-900/60 p-8">
        Play some games to start earning badges!
      </div>
    );
  }

  // Pass only plain serializable values to the client component
  const badgeStats = {
    totalWins: stats.totalWins,
    totalLosses: stats.totalLosses,
    maxStreak: stats.maxStreak,
    winGuessCounts: { ...stats.winGuessCounts },
  };

  // Serialize DB badges for client component
  const serializedBadges = dbBadges.map((b) => ({
    id: b.id,
    category: b.category,
    milestone: b.milestone,
    tier: b.tier,
    earnedAt: b.earnedAt.toISOString(),
    username: b.username,
    minted: b.minted,
  }));

  return (
    <div className="p-4 sm:p-6 bg-white sm:rounded-lg">
      <ProfileBadges
        stats={badgeStats}
        dbBadges={serializedBadges}
        username={user.userData?.username ?? user.name}
        canCollect={user.fid === "11124"}
      />
    </div>
  );
}

async function ProfileStatsContent() {
  const session = await getFarcasterSession();
  const user = session?.user;

  if (!user?.fid) {
    return (
      <div className="text-center text-primary-900/60 p-8 space-y-4">
        <p>Sign in to view your stats</p>
        <div className="flex justify-center">
          <SignIn />
        </div>
      </div>
    );
  }

  const userKey = {
    identityProvider: "fc" as const,
    userId: user.fid,
  };

  return <ProfileGameStats userKey={userKey} />;
}
