"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfToken, signIn, useSession } from "next-auth/react";
import sdk, { SignIn as FrameSignIn } from "@farcaster/miniapp-sdk";
import { useAppRuntime } from "@/app/contexts/app-runtime-context";

/**
 * Auto sign-in for Farcaster Mini App contexts.
 * When running inside a Farcaster Mini App and the user is unauthenticated,
 * silently triggers `sdk.actions.signIn` once on mount. No-op outside Mini App.
 */
export function useMiniAppAutoSignIn() {
  const { status } = useSession();
  const { isMiniApp, isReady } = useAppRuntime();
  const [signingIn, setSigningIn] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const runSignIn = useCallback(async () => {
    setSigningIn(true);
    try {
      const nonce = await getCsrfToken();
      if (!nonce) throw new Error("Unable to generate nonce");
      const result = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true,
      });
      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
    } catch (e) {
      if (!(e instanceof FrameSignIn.RejectedByUser)) {
        console.error("Auto sign-in failed", e);
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady || !isMiniApp) return;
    if (status !== "unauthenticated") return;
    if (attempted) return;
    setAttempted(true);
    runSignIn();
  }, [isReady, isMiniApp, status, attempted, runSignIn]);

  return { signingIn, isAuthenticated: status === "authenticated", status };
}
