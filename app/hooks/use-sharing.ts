"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useCallback } from "react";

import { useJwt } from "./use-jwt";
import { useAppConfig } from "../contexts/app-config-context";
import { useAppRuntime } from "../contexts/app-runtime-context";
import { createCast } from "../lib/cast";
import { createComposeUrl } from "../utils";

export interface Cast {
  text: string;
  embeds: [] | [string] | [string, string];
  channelKey?: string;
}

export function useSharing() {
  const { isMiniApp } = useAppRuntime();
  const { jwt } = useJwt();
  const { isPro } = useAppConfig();

  const composeCast = useCallback(
    async (cast: Cast) => {
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
        window.open(
          createComposeUrl(cast.text, cast.embeds[0] ?? "", { isPro }),
          "_blank",
        );
      }
    },
    [isMiniApp, jwt, isPro],
  );

  return { composeCast };
}
