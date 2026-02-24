import { Metadata } from "next";
import { SignIn } from "@/app/ui/auth/sign-in";
import { ProfileApp } from "@/app/profiles/profile-app";
import { isPro } from "@/app/constants";
import { ArenaList } from "./arena-list";
import { ArenaFilter } from "@/app/api/arenas/list/route";
import { getFarcasterSession } from "@/app/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Framedl by ds8",
    description: "Wordle in a frame",
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ft: ArenaFilter }>;
}) {
  const { ft } = await searchParams;
  const session = await getFarcasterSession();

  const defaultFilterType = session?.user?.fid ? "playable" : "open";
  const filterType = ft ?? defaultFilterType;

  return (
    <ProfileApp headerless>
      <div className="w-full max-w-4xl p-4 h-full flex-1 flex flex-col">
        <div className="sm:pt-4 sm:px-4 flex items-center gap-2 justify-between">
          <div>
            <h1 className="text-xl font-semibold font-space flex items-center flex-wrap whitespace-pre-wrap">
              <span>Framedl</span>
              {isPro && <span style={{ color: "green" }}> PRO</span>}
              <span> ⚔️ ARENA</span>
            </h1>
            <div className="text-primary-900/50 text-sm">
              Browse and join arenas
            </div>
          </div>
          <div>
            <SignIn />
          </div>
        </div>
        <div className="flex-1 flex sm:px-4 pt-6">
          <ArenaList filterType={filterType} />
        </div>
      </div>
    </ProfileApp>
  );
}
