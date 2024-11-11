import { ProfileApp } from "../profile-app";
import { EmptyMessage } from "../empty-message";
import { redirect } from "next/navigation";
import { getFarcasterSession } from "@/app/lib/auth";

export default async function MyProfile() {
  const session = await getFarcasterSession();

  if (session?.user?.fid) {
    return redirect(`/profiles/fc/${session.user.fid}`);
  }

  return (
    <ProfileApp>
      <div className="w-full h-full bg-primary-100 text-left flex-1 text-primary-900">
        <EmptyMessage>Sign in to view your profile</EmptyMessage>
      </div>
    </ProfileApp>
  );
}
