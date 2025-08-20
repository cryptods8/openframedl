"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useCallback, useEffect, useState } from "react";

export function useHaptics() {
  const [capabilities, setCapabilities] = useState<string[] | null>(null);

  useEffect(() => {
    const load = async () => {
      const capabilities = await sdk.getCapabilities();
      setCapabilities(capabilities);
    };
    load();
  }, []);

  const impact = useCallback(async (type: "light" | "medium" | "heavy" | "soft" | "rigid") => {
    if (!capabilities || capabilities.includes("haptics.impactOccurred")) {
      await sdk.haptics.impactOccurred(type);
    }
  }, [capabilities]);

  const notification = useCallback(async (type: "success" | "warning" | "error") => {

    if (!capabilities || capabilities.includes("haptics.notificationOccurred")) {
      await sdk.haptics.notificationOccurred(type);
    }
  }, [capabilities]);

  const selectionChanged = useCallback(async () => {

    if (!capabilities || capabilities.includes("haptics.selectionChanged")) {
      await sdk.haptics.selectionChanged();
    }
  }, [capabilities]);

  return {
    impact,
    notification,
    selectionChanged,
  };
}
