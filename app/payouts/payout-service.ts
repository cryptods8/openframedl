import { v5 as uuidv5 } from "uuid";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { calculatePayouts, PayoutRecipient } from "./payout-calculator";
import { degenToWei, executeDrop, QuidliDropResult } from "./quidli-client";
import {
  findPayout,
  createPayout,
  updatePayoutStatus,
} from "./payout-repository";
import { DBPayout, PayoutDropResult, PayoutRecipientData } from "@/app/db/pg/types";

// Stable UUID namespace for generating deterministic idempotency keys
const PAYOUT_UUID_NAMESPACE = "f7a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c";

function makeIdempotencyKey(
  date: string,
  ip: GameIdentityProvider,
  amount: number
): string {
  return uuidv5(`${date}-${ip}-${amount}`, PAYOUT_UUID_NAMESPACE);
}

export interface PayoutResult {
  id: number;
  status: "completed" | "failed" | "already_completed";
  recipients: PayoutRecipientData[];
  drops: PayoutDropResult[];
  error?: string;
}

export async function executePayout(options: {
  date: string;
  days?: number;
  prize: number;
  piBonus: number;
  identityProvider: GameIdentityProvider;
}): Promise<PayoutResult> {
  const { date, days, prize, piBonus, identityProvider } = options;

  const quidliApiKey = process.env.QUIDLI_API_KEY;
  if (!quidliApiKey) {
    throw new Error("QUIDLI_API_KEY is not configured");
  }

  // 1. Check for existing payout
  let payout = await findPayout(date, identityProvider);

  if (payout?.status === "completed") {
    return {
      id: payout.id,
      status: "already_completed",
      recipients: payout.recipients,
      drops: payout.drops,
    };
  }

  // 2. Calculate recipients if no existing record
  let recipients: PayoutRecipientData[];
  if (!payout) {
    const calculated = await calculatePayouts({
      date,
      days,
      prize,
      piBonus,
      identityProvider,
    });
    recipients = calculated;
    payout = await createPayout({
      date,
      identityProvider,
      status: "pending",
      prize,
      piBonus,
      days: days ?? null,
      recipients: JSON.stringify(recipients),
      drops: JSON.stringify([]),
      updatedAt: new Date(),
      error: null,
    });
  } else {
    // Reuse existing recipients from a prior failed/pending run
    recipients = payout.recipients;
  }

  // 3. Update status to processing
  await updatePayoutStatus(payout.id, "processing");

  // 4. Group recipients by amount
  const amountGroups = new Map<number, string[]>();
  for (const r of recipients) {
    const fids = amountGroups.get(r.amount) ?? [];
    fids.push(r.fid);
    amountGroups.set(r.amount, fids);
  }

  // 5. Execute drops per group
  const existingDrops: PayoutDropResult[] = payout.drops ?? [];
  const succeededAmounts = new Set(
    existingDrops
      .filter((d) => d.status === "success" || d.status === "already_sent")
      .map((d) => d.amount)
  );

  const allDrops: PayoutDropResult[] = [...existingDrops];
  let hasFailure = false;

  for (const [amount, fids] of amountGroups) {
    // Skip already succeeded groups
    if (succeededAmounts.has(amount)) {
      continue;
    }

    const amountInWei = degenToWei(amount);
    const idempotencyKey = makeIdempotencyKey(date, identityProvider, amount);

    let dropResult: PayoutDropResult;
    try {
      const result = await executeDrop(quidliApiKey, fids, amountInWei, idempotencyKey);
      dropResult = {
        amount,
        amountInWei,
        fids,
        status: result.status,
        transferHash: result.transferHash,
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      dropResult = {
        amount,
        amountInWei,
        fids,
        status: "failed",
        error: errorMsg,
      };
      hasFailure = true;
    }

    allDrops.push(dropResult);

    // Persist after each drop so progress survives crashes
    await updatePayoutStatus(
      payout.id,
      "processing",
      allDrops
    );
  }

  // 6. Final status
  const finalStatus = hasFailure ? "failed" : "completed";
  const errorMsg = hasFailure
    ? allDrops
        .filter((d) => d.status === "failed")
        .map((d) => d.error)
        .join("; ")
    : null;

  await updatePayoutStatus(payout.id, finalStatus, allDrops, errorMsg);

  return {
    id: payout.id,
    status: finalStatus,
    recipients,
    drops: allDrops,
    ...(errorMsg ? { error: errorMsg } : {}),
  };
}
