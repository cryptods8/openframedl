import crypto from "crypto";
import { createPublicClient, http, type Address } from "viem";
import { optimism } from "viem/chains";

// Farcaster KeyRegistry on OP mainnet.
// See: https://github.com/farcasterxyz/contracts
const KEY_REGISTRY_ADDRESS: Address =
  "0x00000000Fc1237824fb747aBDE0FF18990E59b7e";

const KEY_REGISTRY_ABI = [
  {
    type: "function",
    name: "keyDataOf",
    stateMutability: "view",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "key", type: "bytes" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "state", type: "uint8" },
          { name: "keyType", type: "uint32" },
        ],
      },
    ],
  },
] as const;

const opClient = createPublicClient({
  chain: optimism,
  transport: http(process.env.OPTIMISM_RPC_URL || undefined),
});

// Freshness window for signed payloads.
const MAX_SKEW_SECONDS = 5 * 60;

// Tiny positive cache for (fid, key) → registered state. JFS signatures are
// usually short-lived, so caching the on-chain lookup per request burst keeps
// OP RPC load sane without undermining revocation — a removed key goes stale
// within CACHE_TTL_MS at worst.
const CACHE_TTL_MS = 60_000;
const keyStateCache = new Map<string, { valid: boolean; expiresAt: number }>();

export type JfsEnvelope = {
  header?: string;
  payload?: string;
  signature?: string;
};

export type JfsHeader = {
  fid: number;
  type: "app_key";
  key: string; // 0x-prefixed Ed25519 public key
};

export type SnapPayload = {
  fid?: number;
  inputs?: Record<string, unknown>;
  button_index?: number;
  timestamp?: number;
};

export type VerifyResult =
  | { valid: true; payload: SnapPayload; fid: number }
  | { valid: false; reason: string };

function base64UrlToBuffer(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function base64UrlToString(input: string): string {
  return base64UrlToBuffer(input).toString("utf8");
}

// Wrap a raw 32-byte Ed25519 public key in a minimal SPKI DER structure so
// node's crypto.createPublicKey can consume it.
function rawEd25519ToSpki(raw: Buffer): Buffer {
  if (raw.length !== 32) {
    throw new Error(`invalid ed25519 public key length: ${raw.length}`);
  }
  const prefix = Buffer.from("302a300506032b6570032100", "hex");
  return Buffer.concat([prefix, raw]);
}

function verifyEd25519(
  publicKeyRaw: Buffer,
  message: Buffer,
  signature: Buffer,
): boolean {
  try {
    const keyObject = crypto.createPublicKey({
      key: rawEd25519ToSpki(publicKeyRaw),
      format: "der",
      type: "spki",
    });
    return crypto.verify(null, message, keyObject, signature);
  } catch (e) {
    console.error("snap: ed25519 verify error", e);
    return false;
  }
}

async function isKeyRegistered(fid: number, key: `0x${string}`): Promise<boolean> {
  const cacheKey = `${fid}:${key.toLowerCase()}`;
  const cached = keyStateCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.valid;
  }
  try {
    const data = (await opClient.readContract({
      address: KEY_REGISTRY_ADDRESS,
      abi: KEY_REGISTRY_ABI,
      functionName: "keyDataOf",
      args: [BigInt(fid), key],
    })) as { state: number; keyType: number };
    // state: 0 = NULL, 1 = ADDED, 2 = REMOVED. keyType: 1 = signer.
    const valid = data.state === 1 && data.keyType === 1;
    keyStateCache.set(cacheKey, { valid, expiresAt: now + CACHE_TTL_MS });
    return valid;
  } catch (e) {
    console.error("snap: KeyRegistry lookup failed", e);
    return false;
  }
}

export async function verifySnapRequest(raw: unknown): Promise<VerifyResult> {
  if (!raw || typeof raw !== "object") {
    return { valid: false, reason: "empty body" };
  }
  const env = raw as JfsEnvelope;
  if (
    typeof env.header !== "string" ||
    typeof env.payload !== "string" ||
    typeof env.signature !== "string"
  ) {
    return { valid: false, reason: "not a JFS envelope" };
  }

  let header: JfsHeader;
  let payload: SnapPayload;
  try {
    header = JSON.parse(base64UrlToString(env.header));
    payload = JSON.parse(base64UrlToString(env.payload));
  } catch {
    return { valid: false, reason: "malformed header or payload" };
  }

  if (header.type !== "app_key") {
    return { valid: false, reason: `unsupported header type: ${header.type}` };
  }
  if (typeof header.fid !== "number" || !header.key?.startsWith("0x")) {
    return { valid: false, reason: "invalid header fields" };
  }
  if (payload.fid !== header.fid) {
    return { valid: false, reason: "fid mismatch between header and payload" };
  }

  // Timestamp freshness — Farcaster timestamps are Unix seconds.
  if (typeof payload.timestamp === "number") {
    const nowSec = Math.floor(Date.now() / 1000);
    const skew = Math.abs(nowSec - payload.timestamp);
    if (skew > MAX_SKEW_SECONDS) {
      return { valid: false, reason: `timestamp skew ${skew}s` };
    }
  }

  // Signing input is the concatenation of the two base64url strings joined
  // with a dot, same shape as JWS.
  const signingInput = Buffer.from(`${env.header}.${env.payload}`, "utf8");
  const signature = base64UrlToBuffer(env.signature);
  const publicKeyRaw = Buffer.from(header.key.slice(2), "hex");

  if (!verifyEd25519(publicKeyRaw, signingInput, signature)) {
    return { valid: false, reason: "bad signature" };
  }

  const registered = await isKeyRegistered(
    header.fid,
    header.key as `0x${string}`,
  );
  if (!registered) {
    return { valid: false, reason: "app key not registered for fid" };
  }

  return { valid: true, payload, fid: header.fid };
}
