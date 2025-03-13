"use client";

import { createContext, useContext, ReactNode } from 'react';

export type AppConfigContextType = {
  externalBaseUrl: string;
  isPro: boolean;
};

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export function AppConfigProvider({ 
  children, 
  config 
}: { 
  children: ReactNode;
  config: AppConfigContextType;
}) {
  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within a AppConfigProvider');
  }
  return context;
} 