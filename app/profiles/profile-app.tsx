"use client";

import { AuthKitProvider } from "@farcaster/auth-kit";
import { domain } from "@/app/lib/auth";
import { SignIn } from "@/app/ui/auth/sign-in";
import { SessionProvider } from "next-auth/react";

const config = {
  relay: "https://relay.farcaster.xyz",
  rpcUrl: "https://mainnet.optimism.io",
  domain: domain,
};

export function ProfileApp({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthKitProvider config={config}>
        <div className="self-stretch bg-primary-500 -mt-8 -mx-8 py-4 px-8 mb-8">
          <div className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto px-2">
            <div className="flex items-center">
              <div className="flex-1 font-space text-3xl text-white font-bold">
                Framedl
              </div>
              <SignIn />
            </div>
          </div>
        </div>

        {children}
      </AuthKitProvider>
    </SessionProvider>
  );
}
