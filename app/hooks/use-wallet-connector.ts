"use client";

import sdk from "@farcaster/miniapp-sdk";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useState } from "react";
import { useConnect, useConnectors } from "wagmi";

/**
 * Returns a `connectWallet` function that auto-selects the right connector:
 * - Inside a Farcaster mini-app: uses the farcasterMiniApp connector directly
 * - In a regular browser: opens the RainbowKit connect modal
 */
export function useWalletConnector() {
  const { connect } = useConnect();
  const connectors = useConnectors();
  const { openConnectModal } = useConnectModal();

  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    const load = async () => {
      const inMiniApp = await sdk.isInMiniApp();
      setIsMiniApp(inMiniApp);
    };
    load();
  }, []);

  console.log("[DEBUG] isMiniApp", isMiniApp);

  const connectWallet = useCallback(() => {
    console.groupCollapsed("[DEBUG] connectWallet");
    console.log(
      "[DEBUG] connector IDs: ",
      connectors.map((x) => x.id),
    );
    if (isMiniApp) {
      const fcConnector = connectors.find((c) => c.id === "farcasterMiniApp");
      console.log("[DEBUG] isMiniApp");
      if (fcConnector) {
        connect({ connector: fcConnector });
        console.log("[DEBUG] fcConnector", fcConnector);
        console.groupEnd();
        return;
      }
    }

    // In a regular browser, open the RainbowKit wallet selection modal
    if (openConnectModal) {
      openConnectModal();
      console.log("[DEBUG] openConnectModal");
      console.groupEnd();
      return;
    }

    // Fallback if modal not available: try injected
    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (injectedConnector) {
      connect({ connector: injectedConnector });
      console.log("[DEBUG] injectedConnector", injectedConnector);
      console.groupEnd();
      return;
    }
  }, [connect, connectors, isMiniApp, openConnectModal]);

  return { connectWallet };
}
