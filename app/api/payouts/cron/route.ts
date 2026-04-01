import { NextRequest, NextResponse } from "next/server";
import { getDailyGameKey } from "@/app/game/game-utils";
import { executePayout } from "@/app/payouts/payout-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_AUTO_PAYOUTS !== "true") {
    return NextResponse.json({ message: "Auto payouts disabled" });
  }

  // Vercel cron auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  const prize = parseInt(process.env.PAYOUT_PRIZE ?? "", 10);
  if (!prize || prize <= 0) {
    console.error("PAYOUT_PRIZE env variable is not set or invalid");
    return NextResponse.json(
      { message: "PAYOUT_PRIZE not configured" },
      { status: 500 }
    );
  }

  const piBonus = parseInt(process.env.PAYOUT_PI_BONUS ?? "50", 10);
  const date = getDailyGameKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  try {
    const result = await executePayout({
      date,
      prize,
      piBonus,
      identityProvider: "fc",
    });

    console.log(`Payout cron result for ${date}:`, JSON.stringify(result));
    return NextResponse.json(result);
  } catch (e) {
    console.error("Payout cron error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
