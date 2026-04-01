import { NextRequest, NextResponse } from "next/server";
import { getDailyGameKey } from "@/app/game/game-utils";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { executePayout } from "@/app/payouts/payout-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(req: NextRequest) {
  if (!ADMIN_SECRET) {
    console.error("Admin secret not set");
    return NextResponse.json({ message: "Auth error" }, { status: 401 });
  }

  const apiKey = req.headers.get("x-framedl-api-key");
  if (apiKey !== ADMIN_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const date =
      body.date ??
      getDailyGameKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const days = body.days ?? undefined;
    const prize = body.prize;
    const piBonus = body.piBonus ?? 50;
    const identityProvider: GameIdentityProvider = body.identityProvider ?? "fc";

    if (typeof prize !== "number" || prize <= 0) {
      return NextResponse.json(
        { message: "prize is required and must be a positive number" },
        { status: 400 }
      );
    }

    const result = await executePayout({
      date,
      days,
      prize,
      piBonus,
      identityProvider,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Payout trigger error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
