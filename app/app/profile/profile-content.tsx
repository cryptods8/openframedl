import { getFarcasterSession } from "@/app/lib/auth";
import { gameService } from "@/app/game/game-service";
import { ProfileGallery } from "@/app/profiles/profile-gallery";
import { GameType } from "@/app/game/game-pg-repository";
import { SignIn } from "@/app/ui/auth/sign-in";

export async function ProfileContent({ gameType }: { gameType?: string }) {
  const session = await getFarcasterSession();
  const user = session?.user;

  if (!user?.fid) {
    return (
      <div className="text-center text-primary-900/60 p-8 space-y-4">
        <p>Sign in to view your games</p>
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

  const gameFilter = {
    ...userKey,
    completedOnly: true,
    type: gameType as GameType | undefined,
  };

  const userData = await gameService.loadUserData(userKey);

  return (
    <ProfileGallery
      isCurrentUser={true}
      filter={gameFilter}
      userData={userData}
      narrow
    />
  );
}
