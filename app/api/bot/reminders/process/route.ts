import { NextRequest, NextResponse } from "next/server";
import { pgDb } from "../../../../db/pg/pg-db";
import { getDailyGameKey } from "../../../../game/game-utils";
import { sendReminder } from "../send-reminder";
import { externalBaseUrl } from "../../../../constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_HOURS_BETWEEN_REMINDERS = 6;

export async function GET(req: NextRequest) {
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  try {
    const gameKey = getDailyGameKey(new Date());
    const now = new Date();
    const maxSentAt = new Date(
      now.getTime() - 1000 * 60 * 60 * MIN_HOURS_BETWEEN_REMINDERS
    );
    const toRemind = await pgDb
      .selectFrom("reminder as r")
      .select(["id", "secret", "userId"])
      .where("enabledAt", "is not", null)
      .where("identityProvider", "=", "fc")
      .where(({ eb }) =>
        eb.parens(
          eb.or([
            eb("lastSentAt", "<", maxSentAt),
            eb("lastSentAt", "is", null),
          ])
        )
      )
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
    for (const row of toRemind) {
      console.log("sending reminder", row.userId);
      const reminder = {
        fid: parseInt(row.userId, 10),
        unsubscribeUrl: `${externalBaseUrl}/bot/reminders/${row.id}/stop?secret=${row.secret}`,
      };
      sendReminder(reminder);
      // this will also delay the next reminder, which is fine because we don't want to spam the API
      await pgDb
        .updateTable("reminder")
        .set({ lastSentAt: new Date(), updatedAt: new Date() })
        .where("id", "=", row.id)
        .execute();
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as any)?.message },
      { status: 500 }
    );
  }
}
