import { ProgressBarIcon } from "@/app/ui/icons/progress-bar-icon";

export default function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-dvh">
      <div className="size-12 p-1 animate-spin flex items-center justify-center text-primary-500">
        <ProgressBarIcon />
      </div>
    </div>
  );
}
