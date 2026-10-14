"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Context } from "@farcaster/miniapp-node";
import sdk from "@farcaster/miniapp-sdk";
import { useSafeAreaInsets } from "./safe-area-context";
import { UserData } from "@/app/game/game-repository";

// ─── Platform types ─────────────────────────────────────────────────

export type AppPlatform =
  | { type: "miniapp"; variant: "farcaster" }
  | { type: "web" };

// ─── Context value ──────────────────────────────────────────────────

export interface AppRuntimeContextValue {
  /** Whether initialization has completed */
  isReady: boolean;
  /** Current platform detection result */
  platform: AppPlatform;
  /** Convenience boolean — platform.type === "miniapp" */
  isMiniApp: boolean;
  /** Farcaster SDK context data, null when not in mini app or not yet loaded */
  sdkContext: Context.MiniAppContext | null;
  /** Normalized Farcaster user data */
  userData: UserData | undefined;
  /** Farcaster user FID */
  userFid: number | undefined;
  /** SDK capabilities list, null until loaded */
  capabilities: string[] | null;
  /** Farcaster client info (safeAreaInsets, added state, etc.) */
  client: Context.MiniAppContext["client"] | undefined;
}

// ─── Helpers ────────────────────────────────────────────────────────

export function toUserData(
  user: Context.MiniAppContext["user"],
): UserData {
  return { ...user, profileImage: user.pfpUrl };
}

// ─── Context ────────────────────────────────────────────────────────

const AppRuntimeContext = createContext<AppRuntimeContextValue>({
  isReady: false,
  platform: { type: "web" },
  isMiniApp: false,
  sdkContext: null,
  userData: undefined,
  userFid: undefined,
  capabilities: null,
  client: undefined,
});

// ─── Provider ───────────────────────────────────────────────────────

export function AppRuntimeProvider({ children }: { children: ReactNode }) {
  const [sdkContext, setSdkContext] =
    useState<Context.MiniAppContext | null>(null);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [capabilities, setCapabilities] = useState<string[] | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { setInsets } = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // 1. Check if we are running inside a Farcaster MiniApp.
        // In standard browsers (window === window.parent && !window.ReactNativeWebView),
        // sdk.isInMiniApp() returns false immediately (0ms) without hanging.
        const inMiniApp = await sdk.isInMiniApp();
        if (cancelled) return;

        if (inMiniApp) {
          setIsMiniApp(true);

          // In MiniApp, fetch context with a timeout guard so it never blocks indefinitely
          const ctx = await Promise.race([
            sdk.context,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]).catch(() => null);

          if (cancelled) return;
          if (ctx) {
            setSdkContext(ctx);
            if (ctx.client?.safeAreaInsets) {
              const sai = ctx.client.safeAreaInsets;
              setInsets({
                top: sai.top ?? 0,
                bottom: sai.bottom ?? 0,
                left: sai.left ?? 0,
                right: sai.right ?? 0,
              });
            }
          }

          try {
            await sdk.actions.ready();
          } catch {}

          try {
            window.focus();
          } catch {}

          try {
            const caps = await Promise.race([
              sdk.getCapabilities(),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
            ]);
            if (!cancelled && caps) setCapabilities(caps);
          } catch {
            // capabilities not available — leave as null
          }
        }
      } catch (err) {
        console.error("AppRuntime init error:", err);
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [setInsets]);

  const userData = useMemo(
    () => (sdkContext?.user ? toUserData(sdkContext.user) : undefined),
    [sdkContext?.user],
  );

  const platform: AppPlatform = isMiniApp
    ? { type: "miniapp", variant: "farcaster" }
    : { type: "web" };

  const value: AppRuntimeContextValue = useMemo(
    () => ({
      isReady,
      platform,
      isMiniApp,
      sdkContext,
      userData,
      userFid: sdkContext?.user?.fid,
      capabilities,
      client: sdkContext?.client,
    }),
    [isReady, isMiniApp, sdkContext, userData, capabilities, platform],
  );

  return (
    <AppRuntimeContext.Provider value={value}>
      {children}
    </AppRuntimeContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useAppRuntime() {
  return useContext(AppRuntimeContext);
}
