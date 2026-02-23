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

  const connectWallet = useCallback(() => {
    if (isMiniApp) {
      const fcConnector = connectors.find((c) => c.id === "farcasterMiniApp");
      if (fcConnector) {
        connect({ connector: fcConnector });
        return;
      }
    }

    // In a regular browser, open the RainbowKit wallet selection modal
    if (openConnectModal) {
      openConnectModal();
      return;
    }

    // Fallback if modal not available: try injected
    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  }, [connect, connectors, isMiniApp, openConnectModal]);

  return { connectWallet };
}
