"use client";

import { sdk } from "@farcaster/frame-sdk";
import { useCallback, useEffect, useState } from "react";

import { useJwt } from "./use-jwt";
import { useAppConfig } from "../contexts/app-config-context";
import { createCast } from "../lib/cast";
import { createComposeUrl } from "../utils";

export interface Cast {
  text: string;
  embeds: [] | [string] | [string, string];
  channelKey?: string;
}

export function useSharing() {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const { jwt } = useJwt();
  const { isPro } = useAppConfig();

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      setIsMiniApp(!!context);
    }
    load();
  }, []);

  const composeCast = useCallback(async (cast: Cast) => {
    if (isMiniApp) {
      await sdk.actions.composeCast({
        ...cast,
        channelKey: cast.channelKey || (isPro ? "framedl-pro" : "framedl"),
      });
      return;
    } else if (jwt) {
      // legacy, revisit
      createCast(window, cast);
    // } else if (navigator.share) {
    //   navigator.share({ text: cast.text, url: cast.embeds[0] });
    } else {
      window.open(createComposeUrl(cast.text, cast.embeds[0] ?? "", { isPro }), "_blank");
    }
  }, [isMiniApp, jwt, isPro]);

  return { composeCast };
}
