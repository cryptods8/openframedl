"use client";

import { useBottomOffset } from "@/app/ui/bottom-nav";

export function ProfilePageWrapper({ children }: { children: React.ReactNode }) {
  const bottomOffset = useBottomOffset();

  return (
    <div style={{ paddingBottom: bottomOffset + 16 }}>
      {children}
    </div>
  );
}
