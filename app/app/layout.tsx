import { BottomNav } from "@/app/ui/bottom-nav";
import { NavVisibilityProvider } from "@/app/contexts/nav-visibility-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavVisibilityProvider>
      {children}
      <BottomNav />
    </NavVisibilityProvider>
  );
}
