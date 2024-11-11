import { NextServerPageProps } from "frames.js/next/types";
import { Metadata } from "next";
import { ArenaCreateForm } from "./arena-create-form";
import { SignIn } from "@/app/ui/auth/sign-in";
import { ProfileApp } from "@/app/profiles/profile-app";
import { isPro } from "@/app/constants";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Framedl by ds8",
    description: "Wordle in a frame",
  };
}

export default async function Page({ searchParams }: NextServerPageProps) {
  const jwt = searchParams?.jwt as string | undefined;

  return (
    <ProfileApp headerless>
      <div className="w-full p-4 h-full flex-1 flex flex-col">
        <div className="sm:pt-4 sm:px-4 flex items-center gap-2 justify-between">
          <div>
            <h1 className="font-space font-bold text-xl">
              Framedl {isPro ? "PRO " : " "}⚔️ ARENA
            </h1>
            <div className="text-primary-900/50 text-sm">Create an arena</div>
          </div>
          <div>
            <SignIn jwt={jwt} />
          </div>
        </div>
        <div className="flex-1 flex sm:px-4">
          <ArenaCreateForm jwt={jwt} />
        </div>
      </div>
    </ProfileApp>
  );
}
