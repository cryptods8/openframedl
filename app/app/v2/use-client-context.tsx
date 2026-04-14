import { useAppConfig } from "@/app/contexts/app-config-context";
import { useAppRuntime } from "@/app/contexts/app-runtime-context";
import { composeCast, createComposeUrl } from "@/app/utils";
import sdk from "@farcaster/miniapp-sdk";
import { useCallback } from "react";

export interface ClientContext {
  userData?: import("@/app/game/game-repository").UserData;
  userFid?: number;
  isReady: boolean;
  isMiniApp: boolean;
  client?: import("@farcaster/miniapp-node").Context.MiniAppContext["client"];
  share: ({ title, url }: { title: string; url: string }) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  requestAddFrame: () => Promise<boolean>;
}

export function useClientContext(): ClientContext {
  const { isPro } = useAppConfig();
  const { isReady, isMiniApp, userData, userFid, client, sdkContext } =
    useAppRuntime();

  const share = useCallback(
    async ({ title, url }: { title: string; url: string }) => {
      if (isMiniApp) {
        await sdk.actions.composeCast(composeCast(title, url, { isPro }));
      } else {
        window.open(createComposeUrl(title, url, { isPro }), "_blank");
      }
    },
    [isPro, isMiniApp],
  );

  const openUrl = useCallback(
    (url: string) => {
      if (isMiniApp) {
        return sdk.actions.openUrl(url);
      } else {
        window.open(url, "_blank");
        return Promise.resolve();
      }
    },
    [isMiniApp],
  );

  const requestAddFrame = useCallback(async () => {
    if (sdkContext?.client?.added || !isMiniApp) {
      return true;
    }
    try {
      await sdk.actions.addFrame();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [sdkContext, isMiniApp]);

  return {
    userData,
    userFid,
    isReady,
    client,
    isMiniApp,
    share,
    openUrl,
    requestAddFrame,
  };
}
