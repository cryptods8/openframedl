import { NextRequest, NextResponse } from "next/server";
import neynarClient from "../../../webhook/neynar-client";
import { externalBaseUrl, isPro } from "@/app/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (!process.env.NEYNAR_SIGNER_UUID) {
    throw new Error("Make sure you set NEYNAR_SIGNER_UUID in your .env file");
  }
  if (isPro) {
    console.log("Skipping daily cast for PRO");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const cast = await neynarClient.publishCast(
      process.env.NEYNAR_SIGNER_UUID,
      `New day, new Framedl is out there\n\nLFG! 🟩🟨⬜`,
      {
        channelId: "framedl",
        embeds: [
          {
            url: `${externalBaseUrl}/?app=1`,
          },
        ],
      }
    );
    console.log("daily cast:", cast);

    return NextResponse.json({ ok: true, message: cast }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as any)?.message },
      { status: 500 }
    );
  }
}
