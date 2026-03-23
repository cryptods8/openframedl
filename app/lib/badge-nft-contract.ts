import {
  createPublicClient,
  http,
  encodePacked,
  keccak256,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

// --- Config ---

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_BADGE_NFT_CA as Address | undefined;

const CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_BADGE_NFT_CHAIN_ID || "8453",
  10,
);

const CHAIN = CHAIN_ID === 8453 ? base : baseSepolia;

// --- ABI (subset for server + client) ---

export const BADGE_NFT_ABI = [
  {
    name: "mintBadge",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "to", type: "address" },
      { name: "badgeId", type: "string" },
      { name: "nonce", type: "bytes32" },
      { name: "price", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "nextTokenId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "usedNonces",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "nonce", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "tokenBadgeId",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "recipient", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "badgeId", type: "string" },
      { indexed: false, name: "nonce", type: "bytes32" },
    ],
    name: "BadgeMinted",
    type: "event",
  },
] as const;

// --- Clients ---

function getPublicClient() {
  return createPublicClient({
    chain: CHAIN,
    transport: http(),
  });
}

function getSignerAccount() {
  const pk = process.env.BADGE_NFT_SIGNER_PK;
  if (!pk) {
    throw new Error("BADGE_NFT_SIGNER_PK is not set");
  }
  return privateKeyToAccount(pk as `0x${string}`);
}

function getContractAddress(): Address {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_BADGE_NFT_CA is not set");
  }
  return CONTRACT_ADDRESS;
}

// --- Server-side helpers ---

/**
 * Build a deterministic nonce from a badge UUID.
 * Each badge can only be minted once, so the UUID itself is sufficient.
 */
export function buildBadgeMintNonce(badgeId: string): `0x${string}` {
  return keccak256(
    encodePacked(["string", "string"], ["badge-mint", badgeId]),
  );
}

/**
 * Sign a badge mint. Returns { nonce, signature, price } that the user
 * passes to mintBadge() on the contract. Price is set by the server
 * and included in the signature so the contract can enforce it.
 */
export async function signBadgeMint(
  toAddress: string,
  badgeId: string,
  price: bigint,
): Promise<{ nonce: `0x${string}`; signature: `0x${string}`; price: string }> {
  const account = getSignerAccount();
  const ca = getContractAddress();
  const nonce = buildBadgeMintNonce(badgeId);

  // Must match the contract: keccak256(abi.encodePacked(to, badgeId, nonce, price, address(this)))
  const messageHash = keccak256(
    encodePacked(
      ["address", "string", "bytes32", "uint256", "address"],
      [toAddress as Address, badgeId, nonce, price, ca],
    ),
  );

  const signature = await account.signMessage({
    message: { raw: messageHash },
  });

  return { nonce, signature, price: price.toString() };
}

/**
 * Verify a badge mint tx and extract the tokenId from BadgeMinted event.
 */
export async function verifyBadgeMintTx(
  txHash: string,
  expectedRecipient: string,
  expectedBadgeId: string,
): Promise<{ valid: boolean; tokenId?: string }> {
  const client = getPublicClient();
  const receipt = await client.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  if (receipt.status !== "success") return { valid: false };

  for (const log of receipt.logs) {
    try {
      const { decodeEventLog } = await import("viem");
      const decoded = decodeEventLog({
        abi: BADGE_NFT_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (
        decoded.eventName === "BadgeMinted" &&
        decoded.args.recipient.toLowerCase() ===
          expectedRecipient.toLowerCase() &&
        decoded.args.badgeId === expectedBadgeId
      ) {
        return {
          valid: true,
          tokenId: decoded.args.tokenId.toString(),
        };
      }
    } catch {
      // not this log
    }
  }
  return { valid: false };
}

// Re-export config for client components
export const BADGE_NFT_CONTRACT_ADDRESS = CONTRACT_ADDRESS;
export const BADGE_NFT_CHAIN_ID = CHAIN_ID;
