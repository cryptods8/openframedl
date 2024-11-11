import { NextServerPageProps } from "frames.js/next/types";

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

export default async function ProfilePage(props: NextServerPageProps) {
  const { params, searchParams } = props;

  const session = await getFarcasterSession();

  const userKey = {
    identityProvider: params.ip as GameIdentityProvider,
    userId: params.uid as string,
  };
  const isCurrentUser =
    userKey.identityProvider === "fc" && userKey.userId === session?.user?.fid;
  const gameFilter = {
    ...userKey,
    completedOnly: true,
    type: searchParams?.gt as GameType | undefined,
  };
  const userData = await gameService.loadUserData(userKey);

  return (
    <ProfileApp>
      <div className="w-full h-full bg-primary-100 text-left flex-1 text-primary-900 py-8 sm:px-8">
        <div className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto px-2">
          <ProfileHeader
            ip={userKey.identityProvider}
            uid={userKey.userId}
            userData={userData}
          />
        </div>
        <div>
          <div className="border-t border-b border-primary-200 py-4 mt-6 mb-4 bg-gradient-to-r from-transparent via-primary-200/50 to-transparent">
            <ProfileNav isCurrentUser={isCurrentUser} />
          </div>
          <Container>
            {searchParams?.tab === "stats" && (
              <ProfileGameStats userKey={userKey} />
            )}
            {!searchParams?.tab && (
              <ProfileGallery
                isCurrentUser={isCurrentUser}
                filter={gameFilter}
                userData={userData}
              />
            )}
            {searchParams?.tab === "words" ? (
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
