import { useAppConfig } from "@/app/contexts/app-config-context";
import { UserData } from "@/app/game/game-repository";
import { composeCast } from "@/app/utils";
import { Context } from "@farcaster/miniapp-node";
import sdk from "@farcaster/miniapp-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface ClientContext {
  userData?: UserData;
  userFid?: number;
  isReady: boolean;
  client?: Context.MiniAppContext["client"];
  share: ({ title, url }: { title: string; url: string }) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  requestAddFrame: () => Promise<boolean>;
}

function toUserData(user: Context.MiniAppContext["user"]) {
  return { ...user, profileImage: user.pfpUrl };
}

export function useClientContext({
  onLoad,
}: {
  onLoad?: (ctx: Context.MiniAppContext) => void;
}): ClientContext {
  const { isPro } = useAppConfig();
  const [context, setContext] = useState<Context.MiniAppContext | undefined>();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = async () => {
      const ctx = await sdk.context;
      setContext(ctx);
      const inMiniApp = await sdk.isInMiniApp();
      if (inMiniApp) {
        sdk.actions.ready();
      }
      window.focus();
      onLoad?.(ctx);
    };
    if (!ready && sdk) {
      setReady(true);
      load();
    }
  }, [ready, onLoad]);

  const userData = useMemo(() => {
    return context?.user ? toUserData(context.user) : undefined;
  }, [context?.user]);

  const share = useCallback(
    async ({ title, url }: { title: string; url: string }) => {
      // return sdk.actions.openUrl(createComposeUrl(title, url, { isPro }));
      await sdk.actions.composeCast(composeCast(title, url, { isPro }));
      return;
    },
    [isPro]
  );

  const openUrl = useCallback((url: string) => {
    return sdk.actions.openUrl(url);
  }, []);

  const requestAddFrame = useCallback(async () => {
    if (context?.client?.added) {
      return true;
    }
    try {
      await sdk.actions.addFrame();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [context]);

  return {
    userData,
    userFid: context?.user?.fid,
    isReady: ready,
    client: context?.client,
    share,
    openUrl,
    requestAddFrame,
  };
}
