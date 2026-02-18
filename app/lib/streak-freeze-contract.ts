import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

// --- Config ---

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_STREAK_FREEZE_CA as Address | undefined;

const CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_STREAK_FREEZE_CHAIN_ID || "8453",
  10
);

const CHAIN = CHAIN_ID === 8453 ? base : baseSepolia;

const FREEZE_TOKEN_ID = 1n;

// --- ABI (subset needed for server + client) ---

export const STREAK_FREEZE_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "burn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "purchaseWithEth",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "purchaseWithErc20",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "ethPrice",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "erc20Token",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "erc20Price",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "paymentMethod", type: "string" },
    ],
    name: "FreezePurchased",
    type: "event",
  },
  // ERC1155 TransferSingle for burn verification
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "operator", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "id", type: "uint256" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "TransferSingle",
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

function getWalletClient() {
  const pk = process.env.STREAK_FREEZE_MINTER_PK;
  if (!pk) {
    throw new Error("STREAK_FREEZE_MINTER_PK is not set");
  }
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({
    account,
    chain: CHAIN,
    transport: http(),
  });
}

function getContractAddress(): Address {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_STREAK_FREEZE_CA is not set");
  }
  return CONTRACT_ADDRESS;
}

// --- Server-side helpers ---

export async function getStreakFreezeBalance(
  walletAddress: string
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: getContractAddress(),
    abi: STREAK_FREEZE_ABI,
    functionName: "balanceOf",
    args: [walletAddress as Address, FREEZE_TOKEN_ID],
  });
}

export async function mintStreakFreeze(
  toAddress: string,
  amount: number
): Promise<string> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: getContractAddress(),
    abi: STREAK_FREEZE_ABI,
    functionName: "mint",
    args: [toAddress as Address, BigInt(amount)],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getFreezePricing() {
  const client = getPublicClient();
  const ca = getContractAddress();

  const [ethPrice, erc20Token, erc20Price] = await Promise.all([
    client.readContract({
      address: ca,
      abi: STREAK_FREEZE_ABI,
      functionName: "ethPrice",
    }),
    client.readContract({
      address: ca,
      abi: STREAK_FREEZE_ABI,
      functionName: "erc20Token",
    }),
    client.readContract({
      address: ca,
      abi: STREAK_FREEZE_ABI,
      functionName: "erc20Price",
    }),
  ]);

  return { ethPrice, erc20Token, erc20Price };
}

/**
 * Verify a burn tx: confirms the tx burned FREEZE_TOKEN_ID from the expected sender
 * to the zero address.
 */
export async function verifyBurnTx(
  burnTxHash: string,
  expectedSender: string
): Promise<boolean> {
  const client = getPublicClient();
  const receipt = await client.getTransactionReceipt({
    hash: burnTxHash as `0x${string}`,
  });

  if (receipt.status !== "success") return false;
  if (receipt.to?.toLowerCase() !== getContractAddress().toLowerCase())
    return false;

  // Look for TransferSingle with to=0x0 (burn)
  for (const log of receipt.logs) {
    try {
      const { decodeEventLog } = await import("viem");
      const decoded = decodeEventLog({
        abi: STREAK_FREEZE_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (
        decoded.eventName === "TransferSingle" &&
        decoded.args.from.toLowerCase() === expectedSender.toLowerCase() &&
        decoded.args.to ===
          "0x0000000000000000000000000000000000000000" &&
        decoded.args.id === FREEZE_TOKEN_ID
      ) {
        return true;
      }
    } catch {
      // not this log
    }
  }
  return false;
}

/**
 * Verify a purchase tx: confirms FreezePurchased event from the expected buyer.
 */
export async function verifyPurchaseTx(
  txHash: string,
  expectedBuyer: string
): Promise<boolean> {
  const client = getPublicClient();
  const receipt = await client.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  if (receipt.status !== "success") return false;

  for (const log of receipt.logs) {
    try {
      const { decodeEventLog } = await import("viem");
      const decoded = decodeEventLog({
        abi: STREAK_FREEZE_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (
        decoded.eventName === "FreezePurchased" &&
        decoded.args.buyer.toLowerCase() === expectedBuyer.toLowerCase()
      ) {
        return true;
      }
    } catch {
      // not this log
    }
  }
  return false;
}

// Re-export config for client components
export const STREAK_FREEZE_CONTRACT_ADDRESS = CONTRACT_ADDRESS;
export const STREAK_FREEZE_CHAIN_ID = CHAIN_ID;
export const STREAK_FREEZE_TOKEN_ID = FREEZE_TOKEN_ID;
