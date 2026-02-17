import { ProfileApp } from "@/app/profiles/profile-app";
import { SignIn } from "@/app/ui/auth/sign-in";
import { CustomWordCreateForm } from "./custom-word-create-form";
import { isPro } from "@/app/constants";

export default function Page() {
  return (
    <ProfileApp headerless>
      <div className="w-full p-4 h-full flex-1 flex flex-col max-w-screen-md">
        <div className="sm:pt-4 sm:px-4 flex items-center gap-2 justify-between">
          <div>
            <h1 className="text-xl font-semibold font-space">
              <span>Framedl</span>
              {isPro && <span style={{ color: "green" }}> PRO</span>}
              <span> Custom Word</span>
            </h1>
            <div className="text-primary-900/50 text-sm">
              Create a custom word
            </div>
          </div>
          <div className="shrink-0">
            <SignIn />
          </div>
        </div>
        <div className="flex-1 flex sm:px-4">
          <CustomWordCreateForm />
        </div>
      </div>
    </ProfileApp>
  );
}
