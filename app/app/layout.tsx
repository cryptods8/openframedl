import { BottomNav } from "@/app/ui/bottom-nav";
import { AppRuntimeProvider } from "@/app/contexts/app-runtime-context";
import { NavVisibilityProvider } from "@/app/contexts/nav-visibility-context";
import { SafeAreaProvider } from "@/app/contexts/safe-area-context";
import { ProfileApp } from "../profiles/profile-app";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <AppRuntimeProvider>
        <NavVisibilityProvider>
          {children}
          {/* TODO refactor, this is hacky */}
          <ProfileApp headerless>
            <BottomNav />
          </ProfileApp>
        </NavVisibilityProvider>
      </AppRuntimeProvider>
    </SafeAreaProvider>
  );
}
