"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import { CheckCircleIcon, RadioIcon } from "@heroicons/react/16/solid";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const types = [
  { label: "All", value: "ALL" },
  { label: "Daily", value: "DAILY" },
  { label: "Practice", value: "PRACTICE" },
  { label: "Custom", value: "CUSTOM" },
  { label: "Art", value: "ART" },
];

export default function GameTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-full">
      <RadioGroup
        value={value}
        onChange={onChange}
        aria-label="Game type"
        className="flex flex-wrap gap-2"
      >
        {types.map((type) => (
          <Radio
            key={type.label}
            value={type.value}
            className="group relative flex cursor-pointer transition rounded-full px-3 py-2 data-[checked]:bg-white/50"
          >
            <div className="flex w-full items-center gap-2 text-primary-900/60 group-data-[checked]:text-primary-900">
              <CheckCircleIcon className="size-6 fill-primary-800 transition hidden group-data-[checked]:inline-block" />
              <div className="size-6 flex items-center justify-center group-data-[checked]:hidden">
                <div className="size-5 border border-2 border-primary-800/60 rounded-full" />
              </div>
              <div className="text-sm/6 pr-1">
                <p className="font-semibold">{type.label}</p>
              </div>
            </div>
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}

export function ProfileGalleryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const gameType = searchParams.get("gt");
  const handleGameTypeChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("gt", value);
    router.replace(`${pathname}?${newParams.toString()}`);
  };

  return (
    <div>
      <GameTypeSelect
        value={gameType || "DAILY"}
        onChange={handleGameTypeChange}
      />
    </div>
  );
}
