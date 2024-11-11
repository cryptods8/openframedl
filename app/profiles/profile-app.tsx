"use client";

import { AuthKitProvider } from "@farcaster/auth-kit";
import { domain } from "@/app/lib/auth";
import { SignIn } from "@/app/ui/auth/sign-in";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const config = {
  relay: "https://relay.farcaster.xyz",
  rpcUrl: "https://mainnet.optimism.io",
  domain: domain,
};

function AuthChildrenContainer({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const jwt = searchParams.get("jwt");

  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!jwt) {
      return;
    }
    setIsSigningIn(true);
    signIn("credentials", { jwt, redirect: false })
      .catch((e) => {
        console.error("E", e);
      })
      .finally(() => {
        setIsSigningIn(false);

        // const newSearchParams = new URLSearchParams(searchParams.toString());
        // newSearchParams.delete("jwt");
        // const query = newSearchParams.toString();
        // const newPathname = pathname + (query ? `?${query}` : "");
        // router.replace(newPathname);
      });
  }, [jwt, router, searchParams, pathname, setIsSigningIn]);

  // if (isSigningIn) {
  //   return null;
  // }

  return <>{children}</>;
}

export function ProfileApp({
  children,
  headerless = false,
}: {
  children: React.ReactNode;
  headerless?: boolean;
}) {
  return (
    <SessionProvider>
      <AuthKitProvider config={config}>
        {!headerless && (
          <div className="w-full sm:px-8">
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
        )}
        <AuthChildrenContainer>{children}</AuthChildrenContainer>
      </AuthKitProvider>
    </SessionProvider>
  );
}
