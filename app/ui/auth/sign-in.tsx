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
import { FarcasterSession, UserInfo } from "@/app/lib/auth";
import { getCsrfToken, signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "../avatar";
import { decode } from "jsonwebtoken";
import { UserKey } from "@/app/game/game-repository";
import { ProgressBarIcon } from "../icons/progress-bar-icon";
import { useJwt } from "@/app/hooks/use-jwt";

function ProfileButton({
  userInfo,
  onSignOut,
  isLoading,
}: {
  userInfo: UserInfo;
  onSignOut: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="inline-flex flex-row items-center text-white font-inter shrink-0">
      <Link
        href={`/profiles/${userInfo.userKey.identityProvider}/${userInfo.userKey.userId}`}
        className="bg-primary-500 w-full pl-1 pr-2 py-1 text-lg font-bold rounded-l-full hover:bg-primary-500/90 active:bg-primary-500/80 inline-flex items-center gap-2 transition duration-150 ease-in-out"
      >
        {isLoading && userInfo.anonymous ? (
          <div className="size-8 p-1 animate-spin flex items-center justify-center">
            <ProgressBarIcon />
          </div>
        ) : (
          <Avatar
            avatar={userInfo.userData?.profileImage}
            username={userInfo.userData?.username}
          />
        )}
        {/* <span className="text-sm font-normal text-white/70">@{session?.user?.name}</span> */}
      </Link>
      <div className="w-px h-10 py-2 bg-primary-500">
        <div className="w-px h-6 bg-white/20" />
      </div>
      <Menu>
        <MenuButton className="inline-flex items-center rounded-r-full bg-primary-500 px-2 py-2.5 data-[hover]:bg-primary-500/90 data-[open]:bg-primary-500/80 transition duration-150 ease-in-out">
          <ChevronDownIcon className="size-5 fill-white/70" />
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
            className="w-48 origin-bottom-right rounded-md border border-primary-200 bg-white shadow-md shadow-primary-500/10 p-1 transition duration-100 ease-out [--anchor-gap:4px] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 font-inter font-semibold"
          >
            <MenuItem>
              <button
                className="flex items-center gap-2 px-3 py-2 hover:bg-primary-100 rounded w-full"
                onClick={onSignOut}
              >
                <ArrowLeftStartOnRectangleIcon className="size-5 fill-primary-900/60" />
                Sign out
              </button>
            </MenuItem>
          </MenuItems>
        </Transition>
      </Menu>
    </div>
  );
}

function userInfoFromJwtOrSession(
  jwt?: string,
  session?: FarcasterSession | null
) {
  if (jwt) {
    return decode(jwt) as { userKey: UserKey; userInfo?: UserInfo };
  }
  const user = session?.user;
  if (user) {
    return {
      userKey: { userId: user.fid, identityProvider: "fc" as const },
      userData: user.userData,
    };
  }
  return {
    userKey: { userId: "0", identityProvider: "fc" as const },
    userData: null,
    anonymous: true,
  };
}

export function SignIn() {
  const { data: session, status } = useSession() as {
    data: FarcasterSession | null;
    status: "loading" | "unauthenticated" | "authenticated";
  };

  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { jwt, clear: clearJwt } = useJwt();

  useEffect(() => {
    // somehow this is necessary to get the "good" nonce
    new Promise((res) => setTimeout(res, 150))
      .then(() => getCsrfToken())
      .then((nonce) => {
        if (!nonce) {
          throw new Error("Unable to generate nonce");
        }
        setNonce(nonce);
      });
  }, [session]);

  useEffect(() => {
    if (!jwt) {
      return;
    }
    setIsSigningIn(true);
    signIn("credentials", { jwt, redirect: false })
      .catch((e) => {
        console.error("E", e);
      })
      .finally(() => {
        setIsSigningIn(false);
      });
  }, [jwt, setIsSigningIn]);

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
    clearJwt();
  }, [signOut, clearJwt]);

  const isLoading = status === "loading" || isSigningIn;
  const userInfo = userInfoFromJwtOrSession(jwt, session);

  return (
    <div className="flex flex-row gap-2">
      {session || isLoading ? (
        <ProfileButton
          userInfo={userInfo}
          onSignOut={handleSignOut}
          isLoading={isLoading}
        />
      ) : (
        nonce && (
          <SignInButton
            key={nonce}
            nonce={nonce}
            onSuccess={handleSuccess}
            onError={() => setError(true)}
            onSignOut={() => signOut()}
            hideSignOut
          />
        )
      )}
    </div>
  );
}
