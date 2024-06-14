import { getServerSession } from "next-auth";
import { ProfileApp } from "../profile-app";
import { EmptyMessage } from "../empty-message";
import { redirect } from "next/navigation";

export default async function MyProfile() {
  const session = await getServerSession();

  if (session?.user?.name) {
    return redirect(`/profiles/fc/${session.user.name}`);
  }

  return (
    <ProfileApp>
      <div className="w-full h-full bg-primary-100 text-left flex-1 text-primary-900">
        <EmptyMessage>Sign in to view your profile</EmptyMessage>
      </div>
    </ProfileApp>
  );
}
