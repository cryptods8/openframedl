import { NextRequest, NextResponse } from "next/server";
import { sendFrameNotifications } from "@/app/utils/send-frame-notifications";
import { getDailyGameKey } from "@/app/game/game-utils";
import { pgDb } from "@/app/db/pg/pg-db";
import { FrameNotificationDetails } from "@farcaster/frame-sdk";
import { isPro } from "@/app/constants";

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
  const type = req.nextUrl.searchParams.get("type");
  try {
    const gameKey = getDailyGameKey(new Date());
    const toNotify = await pgDb
      .selectFrom("userSettings as r")
      .select(["userId", "notificationDetails"])
      .where("notificationsEnabled", "=", true)
      .where("identityProvider", "=", "fc")
      .where((wb) =>
        wb.not(
          wb.exists(
            wb
              .selectFrom("game as g")
              .where("g.isDaily", "=", true)
              .where("g.gameKey", "=", gameKey)
              .where(({ eb }) =>
                eb.parens(
                  eb.or([
                    eb("g.status", "=", "WON"),
                    eb("g.status", "=", "LOST"),
                  ])
                )
              )
              .whereRef("g.userId", "=", "r.userId")
              .whereRef("g.identityProvider", "=", "r.identityProvider")
          )
        )
      )
      .execute();
    const name = isPro ? "Framedl PRO" : "Framedl";
    const title =
      type === "new" ? `New daily ${name}` : `Do not miss your daily ${name}`;
    const body =
      type === "new"
        ? "Your daily game is ready!"
        : "You have last 2 hours to play your daily game!";
    // batch by 100
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
        }, [] as { fid: number; notificationDetails: FrameNotificationDetails }[]);
      await sendFrameNotifications({ recipients, title, body });
      if (i + 100 < toNotify.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    console.log("notifications sent", toNotify.length);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as any)?.message },
      { status: 500 }
    );
  }
}
