"use client";

import { useState, useRef } from "react";

import { useQuery } from "@tanstack/react-query";
import { toast } from "./toasts/toast";
import { PanelTitle } from "./panel-title";
import { ProgressBarIcon } from "./icons/progress-bar-icon";

type ArenaNotifFrequency = "asap" | "daily" | "weekly" | "never";

interface UserSettingsData {
  arenaNotifFrequency: ArenaNotifFrequency;
}

const FREQUENCY_OPTIONS: {
  value: ArenaNotifFrequency;
  label: string;
  description: string;
}[] = [
  {
    value: "asap",
    label: "As soon as possible",
    description: "Get notified immediately when arenas are available",
  },
  {
    value: "daily",
    label: "Daily digest",
    description: "Summary at 6pm UTC",
  },
  {
    value: "weekly",
    label: "Weekly digest",
    description: "Summary on Sundays at 6pm UTC",
  },
  {
    value: "never",
    label: "Never",
    description: "Don't send arena notifications",
  },
];

export function SettingsPanel() {
  const [optimisticFrequency, setOptimisticFrequency] =
    useState<ArenaNotifFrequency | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveCountRef = useRef(0);

  const { data, isLoading, refetch } = useQuery<UserSettingsData>({
    queryKey: ["user-settings"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
  });

  const serverFrequency = data?.arenaNotifFrequency ?? "asap";
  const currentFrequency = optimisticFrequency ?? serverFrequency;

  const handleChange = async (value: ArenaNotifFrequency) => {
    setOptimisticFrequency(value);
    setIsSaving(true);
    const saveId = ++saveCountRef.current;

    try {
      await fetch("/api/user-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arenaNotifFrequency: value }),
      });
      await refetch();
      toast("Settings saved");
    } catch {
      setOptimisticFrequency(null);
      toast("Failed to save settings");
    } finally {
      if (saveCountRef.current === saveId) {
        setOptimisticFrequency(null);
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-primary-950/5 rounded-md" />
        <div className="h-24 bg-primary-950/5 rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <PanelTitle>Arena Notifications</PanelTitle>
          {isSaving && (
            <div className="size-3.5 animate-spin text-primary-900/30">
              <ProgressBarIcon />
            </div>
          )}
        </div>
        <div className="bg-primary-100 rounded-md overflow-hidden">
          {FREQUENCY_OPTIONS.map((option) => {
            const isSelected = currentFrequency === option.value;
            return (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-4 border-b border-primary-300/50 cursor-pointer last:border-b-0 transition-colors hover:bg-primary-200/75 ${
                  isSelected ? "bg-primary-200/75" : ""
                }`}
              >
                <div className="pt-0.5">
                  <input
                    type="radio"
                    name="arena-notif-frequency"
                    className="size-4 text-primary-600 focus:ring-primary-600 border-primary-950/20"
                    checked={isSelected}
                    onChange={() => handleChange(option.value)}
                  />
                </div>
                <div>
                  <div className="font-semibold text-primary-900/80">
                    {option.label}
                  </div>
                  <div className="text-sm text-primary-900/50">
                    {option.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
