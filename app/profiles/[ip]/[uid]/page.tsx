import { gameService } from "@/app/game/game-service";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { ProfileHeader } from "./profile-header";
import { GameType } from "@/app/game/game-pg-repository";
import { ProfileApp } from "@/app/profiles/profile-app";

import { ProfileNav } from "./profile-nav";
import { Container } from "@/app/ui/layout/container";
import { Footer } from "@/app/ui/layout/footer";
import { CustomGames } from "../../custom-games";
import { ProfileGallery } from "../../profile-gallery";
import { EmptyMessage } from "../../empty-message";
import ProfileGameStats from "../../profile-game-stats";
import { getFarcasterSession } from "@/app/lib/auth";
import { SignIn } from "@/app/ui/auth/sign-in";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ ip: string; uid: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ip, uid } = await params;
  const { tab, gt } = await searchParams;

  const session = await getFarcasterSession();

  const userKey = {
    identityProvider: ip as GameIdentityProvider,
    userId: uid as string,
  };
  const isCurrentUser =
    userKey.identityProvider === "fc" && userKey.userId === session?.user?.fid;
  const gameFilter = {
    ...userKey,
    completedOnly: true,
    type: gt as GameType | undefined,
  };
  const userData = await gameService.loadUserData(userKey);

  return (
    <ProfileApp headerless>
      <div className="w-full h-full bg-primary-100 text-left flex-1 text-primary-900 py-8 sm:px-8">
        <div className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto px-2">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <ProfileHeader
                ip={userKey.identityProvider}
                uid={userKey.userId}
                userData={userData}
              />
            </div>
            <SignIn />
          </div>
        </div>
        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-1 bg-primary-200/50 sm:rounded-full px-4 py-2 overflow-x-auto">
            <ProfileNav isCurrentUser={isCurrentUser} />
          </div>
          <Container>
            {tab === "stats" && <ProfileGameStats userKey={userKey} />}
            {!tab && (
              <ProfileGallery
                isCurrentUser={isCurrentUser}
                filter={gameFilter}
                userData={userData}
              />
            )}
            {tab === "words" ? (
              isCurrentUser ? (
                <CustomGames userKey={userKey} />
              ) : (
                <EmptyMessage>You are not allowed to view</EmptyMessage>
              )
            ) : null}
          </Container>
        </div>
      </div>
      <Footer />
    </ProfileApp>
  );
}
