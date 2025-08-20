import { NextRequest, NextResponse } from "next/server";
import { sendFrameNotifications } from "@/app/utils/send-frame-notifications";
import { pgDb } from "@/app/db/pg/pg-db";
import { MiniAppNotificationDetails } from "@farcaster/miniapp-sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 200;

interface CustomNotificationRequest {
  title: string;
  body?: string;
  fids?: number[];
}

export async function POST(req: NextRequest) {
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  try {
    const { title, body, fids } =
      (await req.json()) as CustomNotificationRequest;
    let query = pgDb
      .selectFrom("userSettings as r")
      .select(["userId", "notificationDetails"])
      .where("notificationsEnabled", "=", true)
      .where("identityProvider", "=", "fc");
    if (fids && fids.length > 0) {
      query = query.where(
        "userId",
        "in",
        fids.map((fid) => fid.toString())
      );
    }
    const toNotify = await query.execute();
    console.log("to notify", toNotify.length);
    for (let i = 0; i < toNotify.length; i += 100) {
      const recipients = toNotify
        .slice(i, i + 100)
        .reduce((acc, { userId, notificationDetails }) => {
          if (notificationDetails != null) {
            acc.push({
              fid: parseInt(userId, 10),
              notificationDetails,
            });
          }
          return acc;
        }, [] as { fid: number; notificationDetails: MiniAppNotificationDetails }[]);
      const notificationResult = await sendFrameNotifications({
        recipients,
        title,
        body: body ?? "",
      });
      console.log("sent", recipients.length, notificationResult);
    }
    console.log("notifications sent", toNotify.length);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: (e as any)?.message },
      { status: 500 }
    );
  }
}
