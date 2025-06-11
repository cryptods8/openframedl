"use client";

import { useHaptics } from "@/app/hooks/use-haptics";
import { Button } from "@/app/ui/button/button";

export function HapticsTest() {
  const { impact, notification, selectionChanged } = useHaptics();

  return (
    <div className="flex flex-col gap-4">
      <h2>Haptics Test</h2>
      <div className="flex flex-col gap-2">
        <h3>Impact</h3>
        <Button>Default</Button>
        <Button onClick={() => impact("medium")}>Medium</Button>
        <Button onClick={() => impact("heavy")}>Heavy</Button>
        <Button onClick={() => impact("light")}>Light</Button>
        <Button onClick={() => impact("soft")}>Soft</Button>
        <Button onClick={() => impact("rigid")}>Rigid</Button>
      </div>
      <div className="flex flex-col gap-2">
        <h3>Notification</h3>
        <Button onClick={() => notification("success")}>Success</Button>
        <Button onClick={() => notification("warning")}>Warning</Button>
        <Button onClick={() => notification("error")}>Error</Button>
      </div>
      <div className="flex flex-col gap-2">
        <h3>Selection Changed</h3>
        <Button onClick={() => selectionChanged()}>Selection Changed</Button>
      </div>
    </div>
  )
}