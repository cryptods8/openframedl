import { Metadata } from "next";
import { Suspense } from "react";
import { ProfileApp } from "@/app/profiles/profile-app";
import { SignIn } from "@/app/ui/auth/sign-in";
import { SettingsPanel } from "@/app/ui/settings-panel";
import { StreakFreezePanel } from "@/app/ui/streak-freeze-panel";
import { externalBaseUrl, isPro } from "@/app/constants";
import { MiniAppEmbedNext } from "@farcaster/miniapp-node";
import { ProfileTabs } from "./profile-tabs";
import { ProfileContent } from "./profile-content";
import { ProfilePageWrapper } from "./profile-page-wrapper";
import ProfileGameStats from "@/app/profiles/profile-game-stats";
import { ProfileHeaderFromSession } from "./profile-header-from-session";
import { getFarcasterSession } from "@/app/lib/auth";
import { ProfileBadges } from "./profile-badges";
import { gameService } from "@/app/game/game-service";
import * as badgeRepo from "@/app/game/badge-pg-repository";
import { getCurrentTab } from "./profile-utils";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { tab } = await searchParams;
  const tabValue = Array.isArray(tab) ? tab[0] : tab;
  const isBadgesTab = tabValue === "badges";

  const name = isPro ? "Framedl PRO" : "Framedl";
  const title = isBadgesTab ? `${name} Badges` : `${name} Profile`;
  const description = isBadgesTab
    ? "Earn badges for your Framedl achievements"
    : "Your Framedl profile";

  const imageUrl = `${externalBaseUrl}/api/images/badge-cover?format=png`;
  const launchUrl = isBadgesTab
    ? `${externalBaseUrl}/app/profile?tab=badges`
    : `${externalBaseUrl}/app/profile`;

  const miniAppConfig: MiniAppEmbedNext = {
    version: "next",
    imageUrl,
    button: {
      title: isBadgesTab ? "View Badges" : "Open Profile",
      action: {
        type: "launch_miniapp",
        name,
        url: launchUrl,
        splashImageUrl: isPro
          ? `${externalBaseUrl}/splash-pro.png`
          : `${externalBaseUrl}/splash-v2.png`,
        splashBackgroundColor: "#f3f0f9",
      },
    },
  };
  const miniAppMetadata = JSON.stringify(miniAppConfig);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 800,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    other: {
      "fc:frame": miniAppMetadata,
      "fc:miniapp": miniAppMetadata,
    },
  };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab, gt } = await searchParams;

  // TODO: remove gate once badges are released to all users
  const session = await getFarcasterSession();
  const isBadgeUser = session?.user?.fid === "11124";
  const currentTab = getCurrentTab(
    (tab as string | undefined) ?? null,
    isBadgeUser,
    isPro,
  );

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
            <ProfileTabs showBadges={isBadgeUser} isPro={isPro} />
          </Suspense>

          <ProfilePageWrapper>
            {currentTab === "games" && (
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

            {currentTab === "stats" && (
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

            {currentTab === "badges" && isBadgeUser && !isPro && (
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

            {currentTab === "settings" && (
              <div className="sm:p-4">
                <div className="p-4 sm:p-6 bg-white sm:rounded-lg">
                  <SettingsPanel />
                </div>
              </div>
            )}

            {currentTab === "freezes" && !isPro && (
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
    seen: b.seen,
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
