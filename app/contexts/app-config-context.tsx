"use client";

import { createContext, useContext, ReactNode } from 'react';

export type AppConfigContextType = {
  externalBaseUrl: string;
  isPro: boolean;
};

const defaultContext: AppConfigContextType = {
  externalBaseUrl:
    typeof window !== "undefined" ? window.location.origin : "",
  isPro: false,
};

const AppConfigContext = createContext<AppConfigContextType>(defaultContext);

export function AppConfigProvider({ 
  children, 
  config 
}: { 
  children: ReactNode;
  config: AppConfigContextType;
}) {
  return (
    <AppConfigContext.Provider value={config ?? defaultContext}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  return context ?? defaultContext;
} 