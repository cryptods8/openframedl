"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const DEFAULT_INSETS: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

interface SafeAreaContextValue {
  insets: SafeAreaInsets;
  setInsets: (insets: SafeAreaInsets) => void;
}

const SafeAreaContext = createContext<SafeAreaContextValue>({
  insets: DEFAULT_INSETS,
  setInsets: () => {},
});

export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  const [insets, setInsetsState] = useState<SafeAreaInsets>(DEFAULT_INSETS);
  const setInsets = useCallback(
    (newInsets: SafeAreaInsets) => setInsetsState(newInsets),
    [],
  );

  return (
    <SafeAreaContext.Provider value={{ insets, setInsets }}>
      {children}
    </SafeAreaContext.Provider>
  );
}

export function useSafeAreaInsets() {
  return useContext(SafeAreaContext);
}
