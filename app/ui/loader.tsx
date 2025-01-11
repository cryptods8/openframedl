import { ProgressBarIcon } from "./icons/progress-bar-icon";

export function Loader() {
  return (
    <div className="size-12 p-1 animate-spin flex items-center justify-center text-primary-500">
      <ProgressBarIcon />
    </div>
  );
}
