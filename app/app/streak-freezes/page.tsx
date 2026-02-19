import { ProfileApp } from "@/app/profiles/profile-app";
import { StreakFreezePanel } from "@/app/ui/streak-freeze-panel";

export default function StreakFreezesPage() {
  return (
    <ProfileApp>
      <div className="w-full flex-1 max-w-screen-sm pt-4 px-4 sm:px-8 pb-8 font-inter">
        <div className="w-full pb-6 pt-2 px-2">
          <div className="font-space font-semibold text-xl">Streak Freezes</div>
        </div>
        <StreakFreezePanel />
      </div>
    </ProfileApp>
  );
}
