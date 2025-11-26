import {
  FrameActionPayload,
  getAddressesForFid as frGetAddressesForFid,
  getUserDataForFid as frGetUserDataForFid,
  validateFrameMessage as frValidateFrameMessage,
  UserDataReturnType,
} from "frames.js";

import { hubHttpUrl, hubRequestOptions, hubConfigs } from "../constants";
import { createVerifyAppKeyWithHub } from "@farcaster/miniapp-node";

interface HubOptions {
  hubHttpUrl: string;
  hubRequestOptions: RequestInit | undefined;
}

function getHubOptions(idx?: number): HubOptions {
  if (idx != null) {
    return {
      hubHttpUrl: hubConfigs[idx]!.httpUrl,
      hubRequestOptions: hubConfigs[idx]!.requestOptions,
    };
  }
  return {
    hubHttpUrl: hubHttpUrl,
    hubRequestOptions: hubRequestOptions,
  };
}

// Generate a random offset with a bias towards lower numbers (linear weighting)
// E.g., for N choices, pick k with probability proportional to N-k
function getBiasedRandomOffset(n: number): number {
  const weights = Array.from({ length: n }, (_, i) => n - i);
  const total = weights.reduce((a, b) => a + b, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += weights[i]!;
    if (r < acc) {
      return i;
    }
  }
  return n - 1;
}

const HUB_TIMEOUT_BASE_MS = 1000;

async function tryCallHub<T>(
  fn: (options: HubOptions) => Promise<T>
): Promise<T> {
  const N = hubConfigs.length;
  const offset = getBiasedRandomOffset(N);
  for (let i = 0; i < 10; i++) {
    const hubIndex = (i + offset) % N;
    console.debug(`Trying hub ${hubIndex}`);
    const controller = new AbortController();
    const timeoutDuration = HUB_TIMEOUT_BASE_MS * Math.pow(2, i);
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutDuration);

    try {
      const options = getHubOptions(hubIndex);
      options.hubRequestOptions = {
        ...options.hubRequestOptions,
        signal: controller.signal,
      };
      return await fn(options);
    } catch (e) {
      console.error("Error calling hub", e);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("No hub call succeeded");
}

export async function getUserDataForFid(
  fid: number
): Promise<UserDataReturnType | undefined> {
  return tryCallHub(async (options) => frGetUserDataForFid({ fid, options }));
}

export async function getAddressesForFid(
  fid: number
): Promise<{ address: string }[] | undefined> {
  return tryCallHub(async (options) => frGetAddressesForFid({ fid, options }));
}

export async function validateFrameMessage(payload: FrameActionPayload) {
  return tryCallHub(async (options) =>
    frValidateFrameMessage(payload, options)
  );
}

type VerifyAppKeyResult =
  | {
      valid: true;
      appFid: number;
    }
  | {
      valid: false;
    };
type VerifyAppKey = (
  fid: number,
  appKey: string
) => Promise<VerifyAppKeyResult>;

export function createVerifyAppKey(): VerifyAppKey {
  return async (fid, appKey) => {
    const N = hubConfigs.length;
    const offset = getBiasedRandomOffset(N);
    for (let i = 0; i < 10; i++) {
      const hubIndex = (i + offset) % N;
      console.debug(`Trying hub ${hubIndex}`);
      const controller = new AbortController();
      const timeoutDuration = HUB_TIMEOUT_BASE_MS * Math.pow(2, i);
      const timeout = setTimeout(() => {
        controller.abort();
      }, timeoutDuration);

      try {
        const options = getHubOptions(hubIndex);
        options.hubRequestOptions = {
          ...options.hubRequestOptions,
          signal: controller.signal,
        };
        const verifyAppKey = createVerifyAppKeyWithHub(
          options.hubHttpUrl,
          options.hubRequestOptions
        );
        return await verifyAppKey(fid, appKey);
      } catch (e) {
        console.error("Error calling hub", e);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error("No hub call succeeded");
  };
}
