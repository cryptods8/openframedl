"use client";

import {
  Field,
  Input,
  Switch,
  Label as HeadlessLabel,
  Description as HeadlessDescription,
} from "@headlessui/react";
import { UserSelect } from "./user-select";
import { useState } from "react";
import clsx from "clsx";
import { Button } from "@/app/ui/button/button";
import { CheckIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { formatDurationSimple } from "@/app/game/game-utils";
import { FarcasterUser } from "./search-users";
import { ArenaCreateRequest } from "@/app/api/arenas/route";

function Label({
  children,
  htmlFor,
  position = "top",
}: {
  children: React.ReactNode;
  htmlFor?: string;
  position?: "top" | "left";
}) {
  return (
    <HeadlessLabel
      htmlFor={htmlFor}
      className={clsx(
        "text-sm font-semibold text-primary-900/50",
        position === "top" && "block mb-1.5 px-1",
        position === "left" && "pl-1 mr-3"
      )}
    >
      {children}
    </HeadlessLabel>
  );
}

function InputField({
  label,
  helperText,
  id,
  ...props
}: {
  label: string;
  helperText?: string;
  id: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className={clsx(
          "w-full rounded-md border border-primary-200 bg-white py-3 px-4",
          "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-primary-500"
        )}
        {...props}
      />
      {helperText && (
        <HeadlessDescription className="text-xs text-primary-900/50 mt-1 px-1">
          {helperText}
        </HeadlessDescription>
      )}
    </Field>
  );
}

function isTimeLimitValid(timeLimit: string) {
  if (!timeLimit) {
    return true;
  }
  return /^(\d+d\s+)?(\d+h\s+)?(\d+m\s+)?$/.test(timeLimit.trim() + " ");
}

function parseTimeLimit(timeLimit: string) {
  const parts = timeLimit.split(/\s+/);
  return parts
    .map((part) => {
      const number = part.match(/\d+/)?.[0];
      const unit = part.match(/[dhm]/)?.[0];
      if (number == null || unit == null) {
        return 0;
      }
      return (
        parseInt(number, 10) * (unit === "d" ? 24 * 60 : unit === "h" ? 60 : 1)
      );
    })
    .reduce((acc, num) => acc + num, 0);
}

export function ArenaCreateForm() {
  const [audienceSize, setAudienceSize] = useState(2);
  const [wordCount, setWordCount] = useState(5);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [timeLimit, setTimeLimit] = useState("");
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<FarcasterUser[]>([]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: Partial<ArenaCreateRequest> = {
      audienceSize,
      wordCount,
      start: startDate
        ? { type: "scheduled", date: startDate }
        : { type: "immediate" },
      duration: timeLimit
        ? { type: "interval", minutes: parseTimeLimit(timeLimit) }
        : { type: "unlimited" },
      suddenDeath,
      audience: selectedUsers.map((u) => ({
        userId: u.fid.toString(),
        identityProvider: "fc",
        username: u.username,
      })),
    };
    console.log("payload", payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6 py-6">
        <div>
          <InputField
            label="How many players?"
            id="audience-size"
            type="number"
            min={1}
            max={100}
            step={1}
            value={audienceSize}
            onChange={(e) => setAudienceSize(parseInt(e.target.value, 10))}
            helperText="Enter the number of players. Minimum is 1, maximum is 100."
          />
        </div>
        <div>
          <Field>
            <Label>Who exactly?</Label>
            <UserSelect
              helperText={`Leave blank to allow anyone to join. Up to ${audienceSize} people.`}
              max={audienceSize}
              onListChange={(list) => setSelectedUsers(list)}
            />
          </Field>
        </div>
        <div>
          <InputField
            label="How many words?"
            id="word-count"
            type="number"
            min={1}
            max={9}
            step={1}
            value={wordCount}
            onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
            helperText="The number of words in the arena. Minimum is 1, maximum is 9."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <InputField
              label="When to start?"
              id="start-date"
              type="datetime-local"
              value={startDate ?? ""}
              onChange={(e) => setStartDate(e.target.value)}
              helperText="Leave empty to start immediately"
            />
          </div>
          <div className="relative">
            <InputField
              label="Any time limit?"
              id="time-limit"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              helperText="Leave empty for unlimited time. Otherwise, enter the time limit in minutes, hours, or days. Example: '1d 2h' or '30m'."
            />
            {timeLimit && (
              <div className="absolute top-1 right-1 flex items-center">
                {isTimeLimitValid(timeLimit) ? (
                  <>
                    <CheckIcon className="size-4 text-green-500" />
                    <span className="text-xs text-primary-900/50">
                      {formatDurationSimple(parseTimeLimit(timeLimit))}
                    </span>
                  </>
                ) : (
                  <XMarkIcon className="size-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <Field>
            <div className="flex flex-row items-center">
              <Label position="left">Sudden death</Label>
              <Switch
                checked={suddenDeath}
                onChange={setSuddenDeath}
                disabled={audienceSize !== 2}
                className="group inline-flex h-6 w-11 items-center rounded-full bg-primary-200 transition data-[checked]:bg-primary-500 disabled:opacity-50"
              >
                <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-6" />
              </Switch>
            </div>
            <HeadlessDescription className="text-xs text-primary-900/50 px-1 mt-1.5">
              Enable sudden death to end the arena prematurely. Only enabled for
              arenas with 2 players.
            </HeadlessDescription>
          </Field>
        </div>
      </div>
      <div className="flex flex-row justify-end pt-4 pb-8">
        <Button type="submit" variant="primary">
          Create
        </Button>
      </div>
    </form>
  );
}
