const QUIDLI_API_URL = "https://api.quidli.com";
const DEGEN_CONTRACT = "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed";
const BASE_CHAIN_ID = 8453;
const DEGEN_DECIMALS = 18;

export interface QuidliDropResult {
  status: "success" | "processing" | "already_sent";
  transferHash?: string;
  message?: string;
}

export function degenToWei(amount: number): string {
  // Avoid floating point: use BigInt for 10^18
  return (BigInt(amount) * BigInt(10) ** BigInt(DEGEN_DECIMALS)).toString();
}

export async function executeDrop(
  apiKey: string,
  fids: string[],
  amountInWei: string,
  idempotencyKey: string
): Promise<QuidliDropResult> {
  const body = {
    idempotencyKey,
    chainId: BASE_CHAIN_ID,
    tokenContract: DEGEN_CONTRACT,
    amountInWeiPerRecipient: amountInWei,
    recipients: fids.map((fid) => ({ type: "farcaster" as const, fid })),
  };

  const res = await fetch(
    `${QUIDLI_API_URL}/drop?ignoreFailedRecipients=true`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 201) {
    const data = await res.json();
    return { status: "success", transferHash: data.transferHash };
  }

  if (res.status === 202) {
    const data = await res.json();
    return { status: "processing", message: data.message };
  }

  if (res.status === 409) {
    return { status: "already_sent" };
  }

  const errorText = await res.text();
  throw new Error(`Quidli API error ${res.status}: ${errorText}`);
}
