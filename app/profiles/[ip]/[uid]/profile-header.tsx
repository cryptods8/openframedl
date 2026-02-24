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
    <div className="flex flex-row gap-3 md:gap-6 items-center">
      <div
        className="bg-cover bg-center size-12 md:size-20 rounded"
        style={{ backgroundImage: `url('${userData?.profileImage}')` }}
      />
      <div className="flex-1">
        <h2 className="text-lg md:text-2xl text-primary-900/80 font-semibold">
          {userData?.displayName || `User ${props.uid}`}
        </h2>
        <span className="text-primary-900/60 text-sm md:text-lg">
          @{userData?.username || `!${props.uid}`}
        </span>
        {/* <div className="max-w-prose text-primary-900/80 line-clamp-3 hidden md:block">{userData?.bio}</div> */}
      </div>
    </div>
  );
}
