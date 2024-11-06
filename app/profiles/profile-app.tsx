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
        <div className="w-full px-8">
          <div className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto px-2 py-4">
            <div className="flex items-center">
              <div className="flex-1 font-space text-3xl text-primary-900/80 font-bold">
                Framedl
              </div>
              <SignIn />
            </div>
          </div>
          <div className="border-b border-primary-200 w-full" />
        </div>

        {children}
      </AuthKitProvider>
    </SessionProvider>
  );
}
