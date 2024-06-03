"use client";

import { UserData } from "../../../game/game-repository";

export interface ProfileHeaderProps {
  ip: string;
  uid: string;
  userData: UserData | null | undefined;
}

export function ProfileHeader(props: ProfileHeaderProps) {
  const { userData } = props;
  return (
    <div className="flex flex-row gap-6 items-center">
      <div
        className="bg-cover bg-center size-16 md:size-24 rounded"
        style={{ backgroundImage: `url('${userData?.profileImage}')` }}
      />
      <div className="flex-1">
        <h2 className="text-2xl font-space flex flex-wrap items-baseline gap-x-3">
          <strong>{userData?.displayName || `User ${props.uid}`}</strong>
          <span className="text-primary-900/60 text-xl">@{userData?.username || `!${props.uid}`}</span>
        </h2>
        <div className="max-w-prose text-primary-900/80 line-clamp-3 hidden md:block">{userData?.bio}</div>
      </div>
    </div>
  );
}
