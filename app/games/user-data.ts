import {
  UserDataReturnType,
} from "frames.js";

import { UserData, UserKey } from "@/app/game/game-repository";
import {
  checkPassOwnership,
  FramedlProPassOwnership,
} from "@/app/pro/pass-ownership";
import { isPro } from "@/app/constants";
import { getEnsFromAddress } from "@/app/get-ens";
import { getUserDataForFid, getAddressesForFid } from "@/app/lib/hub";

async function loadFidFromWc(username: string): Promise<number | undefined> {
  const resp = await fetch(
    `https://api.farcaster.xyz/v2/user-by-username?username=${username}`
  );
  const { result } = (await resp.json()) as {
    result: { user: { fid: number } };
  };
  return result?.user?.fid || undefined;
}

async function loadFidFromVasco(username: string): Promise<number | undefined> {
  const resp = await fetch(`https://vasco.wtf/${username}`, {
    redirect: "manual",
  });
  const location = resp.headers.get("location");
  const fidStr = location?.split("/").pop();
  const fid = fidStr ? parseInt(fidStr, 10) : undefined;
  return fid;
}

export async function loadFid(username: string): Promise<number | undefined> {
  const fid = await loadFidFromWc(username);
  if (fid != null) {
    return fid;
  }
  return await loadFidFromVasco(username);
}

// vasco.wtf handles *.eth names too
// export async function loadFid(username: string): Promise<number | undefined> {
//   const resp = await fetch(
//     `https://fnames.farcaster.xyz/transfers?name=${username}`
//   );
//   const { transfers } = (await resp.json()) as { transfers: { to: number }[] };
//   return transfers[0]?.to;
// }

export async function loadUsername(
  userKey: UserKey
): Promise<string | undefined> {
  switch (userKey.identityProvider) {
    case "fc_unauth":
    case "fc": {
      const fid = parseInt(userKey.userId, 10);
      const userData = await getUserDataForFid(fid);
      return userData?.username;
    }
    case "xmtp": {
      const ens = await getEnsFromAddress(userKey.userId);
      return ens ?? undefined;
    }
    case "anon": {
      return undefined;
    }
    default: {
      throw new Error(
        "Unsupported identity provider: " + userKey.identityProvider
      );
    }
  }
}

export async function loadUserData(userKey: UserKey): Promise<UserData> {
  let userData: UserDataReturnType | undefined;
  let walletAddresses: string[] = [];
  let passOwnership: FramedlProPassOwnership | undefined | null = null;
  switch (userKey.identityProvider) {
    case "fc_unauth":
    case "fc": {
      const fid = parseInt(userKey.userId, 10);
      const userDataPromise = getUserDataForFid(fid);
      if (isPro) {
        const [userDataRes, addressesRes] = await Promise.all([
          userDataPromise,
          getAddressesForFid(fid),
        ]);
        userData = userDataRes;
        walletAddresses = (addressesRes as { address: string }[]).map(
          (a) => a.address
        );
      } else {
        userData = await userDataPromise;
      }
      break;
    }
    case "xmtp": {
      walletAddresses.push(userKey.userId);
      const ens = await getEnsFromAddress(userKey.userId);
      if (ens) {
        userData = {
          displayName: ens,
          username: ens,
        };
      }
      break;
    }
    case "anon": {
      userData = {};
      break;
    }
    default: {
      throw new Error(
        "Unsupported identity provider: " + userKey.identityProvider
      );
    }
  }
  if (isPro) {
    let passOwnershipResult;
    try {
      passOwnershipResult = await checkPassOwnership(walletAddresses);
    } catch (e) {
      console.error("Error checking pass ownership", e);
    }
    passOwnership = passOwnershipResult;
  }
  return { ...userData, passOwnership };
}
