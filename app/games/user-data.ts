import {
  getAddressesForFid,
  getUserDataForFid,
  UserDataReturnType,
} from "frames.js";

import { UserData, UserKey } from "@/app/game/game-repository";
import {
  checkPassOwnership,
  FramedlProPassOwnership,
} from "@/app/pro/pass-ownership";
import { hubHttpUrl, hubRequestOptions, isPro } from "@/app/constants";
import { getEnsFromAddress } from "@/app/get-ens";

export async function loadFid(username: string): Promise<number | undefined> {
  const resp = await fetch(
    `https://fnames.farcaster.xyz/transfers?name=${username}`
  );
  const { transfers } = (await resp.json()) as { transfers: { to: number }[] };
  return transfers[0]?.to;
}

export async function loadUsername(
  userKey: UserKey
): Promise<string | undefined> {
  switch (userKey.identityProvider) {
    case "fc": {
      const fid = parseInt(userKey.userId, 10);
      const options = { hubHttpUrl, hubRequestOptions };
      const userData = await getUserDataForFid({ fid, options });
      return userData?.username;
    }
    case "xmtp": {
      const ens = await getEnsFromAddress(userKey.userId);
      return ens ?? undefined;
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
    case "fc": {
      const fid = parseInt(userKey.userId, 10);
      const options = { hubHttpUrl, hubRequestOptions };
      const userDataPromise = getUserDataForFid({ fid, options });
      if (isPro) {
        const [userDataRes, addressesRes] = await Promise.all([
          userDataPromise,
          getAddressesForFid({ fid, options }),
        ]);
        userData = userDataRes;
        walletAddresses = addressesRes.map((a) => a.address);
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
