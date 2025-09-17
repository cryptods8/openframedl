import { Metadata } from "next";
import { ArenaCreateForm } from "./arena-create-form";
import { SignIn } from "@/app/ui/auth/sign-in";
import { ProfileApp } from "@/app/profiles/profile-app";
import { isPro } from "@/app/constants";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Framedl by ds8",
    description: "Wordle in a frame",
  };
}

export default async function Page() {
  return (
    <ProfileApp headerless>
      <div className="w-full max-w-2xl p-4 h-full flex-1 flex flex-col">
        <div className="sm:pt-4 sm:px-4 flex items-center gap-2 justify-between">
          <div>
            <Link href="/app/arena">
              <h1 className="text-xl font-semibold font-space flex items-center flex-wrap whitespace-pre-wrap">
                <span>Framedl</span>
                {isPro && <span style={{ color: "green" }}> PRO</span>}
                <span> ⚔️ ARENA</span>
              </h1>
            </Link>
            <div className="text-primary-900/50 text-sm">Create an arena</div>
          </div>
          <div>
            <SignIn />
          </div>
        </div>
        <div className="flex-1 flex sm:px-4">
          <ArenaCreateForm />
        </div>
      </div>
    </ProfileApp>
  );
}
