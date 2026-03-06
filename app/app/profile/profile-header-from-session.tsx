import { getFarcasterSession } from "@/app/lib/auth";
import { gameService } from "@/app/game/game-service";
import { ProfileHeader } from "@/app/profiles/[ip]/[uid]/profile-header";

export async function ProfileHeaderFromSession() {
  const session = await getFarcasterSession();
  const user = session?.user;

  if (!user?.fid) {
    return (
      <>
        <div className="font-space text-lg min-[360px]:text-xl font-semibold">
          Framedl
        </div>
        <div className="text-primary-900/50 text-sm">Profile</div>
      </>
    );
  }

  const userKey = {
    identityProvider: "fc" as const,
    userId: user.fid,
  };

  const userData = await gameService.loadUserData(userKey);

  return (
    <ProfileHeader
      ip={userKey.identityProvider}
      uid={userKey.userId}
      userData={userData}
    />
  );
}
