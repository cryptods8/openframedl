"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { FarcasterUser, searchUsers } from "./search-users";
import { Avatar } from "@/app/ui/avatar";
import { XMarkIcon } from "@heroicons/react/16/solid";
import { ProgressBarIcon } from "@/app/ui/icons/progress-bar-icon";

export function UserSelect({
  helperText,
  max,
  onSelect,
  onListChange,
}: {
  helperText?: string;
  max?: number;
  onSelect?: (user: FarcasterUser, list: FarcasterUser[]) => void;
  onListChange?: (list: FarcasterUser[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FarcasterUser | null>(null);
  const [people, setPeople] = useState<FarcasterUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<FarcasterUser[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (user: FarcasterUser | null) => {
    if (!user) {
      return;
    }
    setSelected(user);
    let newList = list;
    if (!list.find((u) => u.fid === user.fid)) {
      newList = [...list, user];
      setList(newList);
      if (onListChange) {
        onListChange(newList);
      }
    }
    if (onSelect) {
      onSelect(user, newList);
    }
    setQuery("");
  };

  const handleRemove = (user: FarcasterUser) => {
    const newList = list.filter((u) => u.fid !== user.fid);
    setList(newList);
    if (onListChange) {
      onListChange(newList);
    }
  };

  useEffect(() => {
    if (debouncedQuery === "") {
      setPeople([]);
      return;
    }

    setLoading(true);

    const abortController = new AbortController();
    searchUsers(debouncedQuery, abortController.signal)
      .then((result) => {
        setPeople(result.result.users);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        throw error;
      })
      .finally(() => setLoading(false));

    return () => abortController.abort();
  }, [debouncedQuery]);

  return (
    <div className="w-full">
      <Combobox onChange={handleSelect} onClose={() => setQuery("")}>
        <div className="relative w-full">
          <ComboboxInput
            className={clsx(
              "w-full rounded-md border border-primary-200 bg-white py-3 px-4",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-primary-500"
            )}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a user"
          />
          {loading && (
            <div className="absolute top-0 right-2 bottom-0 flex items-center justify-center">
              <div className="size-6 p-1 animate-spin flex items-center justify-center">
                <ProgressBarIcon />
              </div>
            </div>
          )}
        </div>

        <ComboboxOptions
          anchor="bottom"
          className={clsx(
            "w-[var(--input-width)] rounded-md bg-white shadow-lg shadow-primary-500/10 p-1 [--anchor-gap:var(--spacing-1)] empty:invisible",
            "transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0"
          )}
        >
          {people.map((person) => (
            <ComboboxOption
              key={person.fid}
              value={person}
              className="group flex cursor-default items-center gap-4 rounded py-2 px-3 select-none data-[focus]:bg-primary-100"
            >
              {/* <CheckIcon
                className={clsx("size-4 fill-primary-900", {
                  invisible: person.fid !== selected?.fid,
                  visible: person.fid === selected?.fid,
                })}
              /> */}
              <Avatar avatar={person.pfp?.url} username={person.username} />
              <div className="text-primary-900/80">
                <div className="text-sm font-medium">{person.displayName}</div>
                <div className="text-xs">@{person.username}</div>
              </div>
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>
      {list.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1 my-2">
          {list.slice(0, max != null ? max : list.length).map((user) => (
            <div
              key={user.fid}
              className="flex border border-primary-600 rounded-md bg-primary-500 py-1 pl-3 pr-1 items-center gap-2 "
            >
              <Avatar avatar={user.pfp?.url} username={user.username} />
              <div className="text-white max-w-24">
                <div className="text-sm font-medium truncate">
                  {user.displayName}
                </div>
                <div className="text-xs text-white/70 truncate">
                  @{user.username}
                </div>
              </div>
              <button onClick={() => handleRemove(user)} className="group p-2">
                <XMarkIcon className="size-6 text-white/50 group-hover:text-white/100" />
              </button>
            </div>
          ))}
        </div>
      )}
      {helperText && (
        <p className="text-xs text-primary-900/50 mt-1 px-1">{helperText}</p>
      )}
    </div>
  );
}
