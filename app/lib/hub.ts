import {
  FrameActionPayload,
  getAddressesForFid as frGetAddressesForFid,
  getUserDataForFid as frGetUserDataForFid,
  validateFrameMessage as frValidateFrameMessage,
  UserDataReturnType,
} from "frames.js";

import { hubHttpUrl, hubRequestOptions } from "../constants";
import { createVerifyAppKeyWithHub } from "@farcaster/miniapp-node";

function getHubOptions(): {
  hubHttpUrl: string;
  hubRequestOptions: Record<string, string>;
} {
  return {
    hubHttpUrl: hubHttpUrl,
    hubRequestOptions: hubRequestOptions,
  };
}

export async function getUserDataForFid(
  fid: number
): Promise<UserDataReturnType | undefined> {
  const options = getHubOptions();
  return frGetUserDataForFid({ fid, options });
}

export async function getAddressesForFid(
  fid: number
): Promise<{ address: string }[] | undefined> {
  const options = getHubOptions();
  return frGetAddressesForFid({ fid, options });
}

export async function validateFrameMessage(payload: FrameActionPayload) {
  const options = getHubOptions();
  return frValidateFrameMessage(payload, options);
}

export function createVerifyAppKey() {
  const { hubHttpUrl, hubRequestOptions } = getHubOptions();
  return createVerifyAppKeyWithHub(hubHttpUrl, hubRequestOptions);
}
