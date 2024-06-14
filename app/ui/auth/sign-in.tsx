"use client";

import { SignInButton, StatusAPIResponse } from "@farcaster/auth-kit";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import {
  ArrowLeftStartOnRectangleIcon,
  ChevronDownIcon,
} from "@heroicons/react/16/solid";
import { Session } from "next-auth";
import { getCsrfToken, signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useState } from "react";

function ProfileButton({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  return (
    <div className="inline-flex flex-row text-white">
      <Link
        href={`/profiles/fc/${session.user?.name}`}
        className="bg-primary-400 w-full px-5 py-3 text-lg font-bold rounded-l-lg hover:bg-primary-400/80 active:bg-primary-400/70 inline-flex items-center gap-2 transition duration-150 ease-in-out"
      >
        {session?.user?.image ? (
          <img src={session?.user.image} className="w-8 h-8 rounded-full" />
        ) : null}
      </Link>
      <Menu>
        <MenuButton className="inline-flex items-center rounded-r-lg bg-primary-400 py-3 px-3 data-[hover]:bg-primary-400/80 data-[open]:bg-primary-400/70 border-l border-primary-500 transition duration-150 ease-in-out">
          <ChevronDownIcon className="size-6 fill-white/80" />
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
            anchor="bottom end"
            className="w-52 origin-top-right mt-1 rounded-lg text-white bg-primary-500 font-bold [--anchor-gap:var(--spacing-1)] focus:outline-none shadow-lg"
          >
            <MenuItem>
              <button
                className="group flex w-full items-center gap-2 rounded-lg py-3 px-5 bg-primary-400 data-[focus]:bg-primary-400/80 transition duration-150 ease-in-out"
                onClick={onSignOut}
              >
                <ArrowLeftStartOnRectangleIcon className="size-5 fill-white/80" />
                Sign out
              </button>
            </MenuItem>
          </MenuItems>
        </Transition>
      </Menu>
    </div>
  );
}

export function SignIn() {
  const { data: session } = useSession();

  const [error, setError] = useState(false);

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) {
      throw new Error("Unable to generate nonce");
    }
    return nonce;
  }, []);

  const handleSuccess = useCallback((res: StatusAPIResponse) => {
    signIn("credentials", {
      message: res.message,
      signature: res.signature,
      name: res.username,
      pfp: res.pfpUrl,
      redirect: true,
    });
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  return (
    <div className="flex flex-row gap-2">
      {session ? (
        <ProfileButton session={session} onSignOut={handleSignOut} />
      ) : (
        <SignInButton
          nonce={getNonce}
          onSuccess={handleSuccess}
          onError={() => setError(true)}
          onSignOut={() => signOut()}
        />
      )}
    </div>
  );
}
