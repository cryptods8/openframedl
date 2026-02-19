"use client";

import { Dialog } from "./dialog";
import { StreakFreezePanel } from "./streak-freeze-panel";

interface StreakFreezeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function StreakFreezeDialog({ open, onClose }: StreakFreezeDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-space font-bold text-xl">Streak Freezes</h2>
        </div>
        <StreakFreezePanel />
      </div>
    </Dialog>
  );
}
