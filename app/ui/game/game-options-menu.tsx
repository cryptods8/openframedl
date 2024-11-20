import clsx from "clsx";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  MenuSeparator,
  Transition,
} from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/16/solid";
import Link from "next/link";

export function GameOptionsMenu({
  onNewGame,
  showDaily,
}: {
  onNewGame: (gameType: "practice" | "daily") => void;
  showDaily?: boolean;
}) {
  return (
    <Menu>
      <MenuButton
        onKeyDown={(e) => {
          if (e.key.toLowerCase() === "enter") {
            e.preventDefault();
          }
        }}
        className={clsx(
          "size-10 rounded-full shadow-md shadow-primary-500/10 flex items-center justify-center bg-white border-primary-100 border",
          "hover:bg-primary-100 hover:border-primary-200 active:bg-primary-200 active:border-primary-300 active:shadow-primary-500/0 transition-all duration-150"
        )}
      >
        <EllipsisVerticalIcon className="size-5 text-primary-900/70" />
      </MenuButton>
      <Transition
        enter="transition ease-out duration-75"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <MenuItems
          static
          anchor="top"
          className={clsx(
            "w-48 origin-bottom-right rounded-md border border-primary-200 bg-white shadow-md shadow-primary-500/10 p-1 transition duration-100 ease-out [--anchor-gap:4px] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 font-inter font-semibold"
          )}
        >
          {showDaily && (
            <MenuItem>
              <Link
                href={`/app?gt=daily&t=${Math.floor(Date.now() / 1000)}`}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary-100 data-[focus]:bg-primary-100 rounded"
              >
                <span>Play Daily</span>
              </Link>
            </MenuItem>
          )}
          <MenuItem>
            <button
              onClick={() => onNewGame("practice")}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary-100 data-[focus]:bg-primary-100 rounded"
            >
              <span>Practice</span>
            </button>
          </MenuItem>
          <MenuSeparator className="my-1 h-px bg-primary-200" />
          <MenuItem>
            <Link
              href="/app/arena/create"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary-100 data-[focus]:bg-primary-100 rounded"
            >
              <span>Create ARENA</span>
            </Link>
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
