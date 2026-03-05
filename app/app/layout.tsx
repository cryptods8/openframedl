import { BottomNav } from "@/app/ui/bottom-nav";
import { NavVisibilityProvider } from "@/app/contexts/nav-visibility-context";
import { SafeAreaProvider } from "@/app/contexts/safe-area-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <NavVisibilityProvider>
        {children}
        <BottomNav />
      </NavVisibilityProvider>
    </SafeAreaProvider>
  );
}
