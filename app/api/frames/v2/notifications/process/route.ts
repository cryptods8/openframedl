import { NextRequest, NextResponse } from "next/server";
import { sendFrameNotifications } from "@/app/utils/send-frame-notifications";
import { addDaysToDate, getDailyGameKey } from "@/app/game/game-utils";
import { pgDb } from "@/app/db/pg/pg-db";
import { FrameNotificationDetails } from "@farcaster/frame-sdk";
import { isPro } from "@/app/constants";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { getWordForUserGameKey } from "@/app/game/game-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 200;

async function getYesterdaysWord(ip: GameIdentityProvider) {
  const yesterday = addDaysToDate(new Date(), -1);
  const gameKey = getDailyGameKey(yesterday);
  const { word } = await getWordForUserGameKey({
    gameKey,
    userId: "unimportant",
    identityProvider: ip,
    isDaily: true,
  });
  return word;
}

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
    const yesterdayWord = await getYesterdaysWord("fc");
    const title =
      type === "new"
        ? `New daily ${name}`
        : type === "mid"
        ? `Have you played ${name} today?`
        : `Do not miss your daily ${name}`;
    const body =
      type === "new"
        ? isPro
          ? "Your daily game is ready!"
          : `${yesterdayWord.toUpperCase()} stumped many! Can you crack today's word?`
        : type === "mid"
        ? "Just here, in your notifs, reminding my own business…"
        : "You have 4 hours left to play your daily game!";
    // batch by 100
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
        }, [] as { fid: number; notificationDetails: FrameNotificationDetails }[]);
      const notificationResult = await sendFrameNotifications({
        recipients,
        title,
        body,
      });
      console.log("sent", recipients.length, notificationResult);
      // if (i + 100 < toNotify.length) {
      //   await new Promise((resolve) => setTimeout(resolve, 50));
      // }
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
