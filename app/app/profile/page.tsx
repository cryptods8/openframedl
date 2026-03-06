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

async function ProfileStatsContent() {
  const { getFarcasterSession } = await import("@/app/lib/auth");
  const session = await getFarcasterSession();
  const user = session?.user;

  if (!user?.fid) {
    const { SignIn } = await import("@/app/ui/auth/sign-in");
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
