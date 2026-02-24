import { ProfileApp } from "@/app/profiles/profile-app";
import { SignIn } from "@/app/ui/auth/sign-in";
import { Button } from "@/app/ui/button/button";
import { StreakFreezePanel } from "@/app/ui/streak-freeze-panel";

export default function StreakFreezesPage() {
  return (
    <div className="w-full h-dvh min-h-full">
      <ProfileApp headerless>
        <div className="min-w-72 max-w-2xl mx-auto px-0 sm:px-4">
          <div className="flex items-center justify-between p-4 sm:p-6 gap-3">
            <div className="flex-1">
              <div className="font-space text-lg min-[360px]:text-xl font-semibold">
                Framedl
              </div>
              <div className="text-primary-900/50 text-sm">Streak Freezes</div>
            </div>
            <SignIn />
          </div>
          <div className="p-4 sm:p-6 bg-white sm:rounded-lg">
            <StreakFreezePanel />
          </div>
          <div className="py-4 sm:py-6 px-4 sm:px-0">
            <Button href="/app/v2" variant="outline">
              Go to Daily Game
            </Button>
          </div>
        </div>
      </ProfileApp>
    </div>
  );
}
