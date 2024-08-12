import { pgDb } from "@/app/db/pg/pg-db";
import { findArenasWithGames } from "@/app/game/arena-pg-repository";
import { notifyArenaMembers } from "@/app/games/arena/arena-utils";
import { sql } from "kysely";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_HOURS_BETWEEN_REMINDERS = 2;

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
    const now = new Date();
    const maxNotifiedAt = new Date(
      now.getTime() - 1000 * 60 * 60 * MIN_HOURS_BETWEEN_REMINDERS
    );
    const arenas = await findArenasWithGames((q) => {
      return (
        q
          .where((db) =>
            db.or([
              db.eb("a.lastNotifiedAt", "<", maxNotifiedAt),
              db.eb("a.lastNotifiedAt", "is", null),
            ])
          )
          .where((db) =>
            db.or([
              // it was created less than 30 minutes ago
              db.eb(
                "a.createdAt",
                ">",
                new Date(now.getTime() - 1000 * 60 * 30)
              ),
              // or it has started less than 30 minutes ago
              db.between(
                sql<Date>`case when config->'start'->>'type' = 'immediate' then started_at else to_timestamp(config->'start'->>'date', 'yyyy-mm-dd') end`,
                new Date(now.getTime() - 1000 * 60 * 30),
                now
              ),
              // or it is ending in less than 1 hour
              db.between(
                sql<Date>`case when config->'start'->>'type' = 'immediate' and started_at is not null and config->'duration'->>'type' = 'interval' then started_at + (config->'duration'->>'minutes' || ' minutes')::interval when config->'start'->>'type' = 'scheduled' and config->'duration'->>'type' = 'interval' then to_timestamp(config->'start'->>'date', 'yyyy-mm-dd') + (config->'duration'->>'minutes' || ' minutes')::interval end`,
                now,
                new Date(now.getTime() + 1000 * 60 * 60)
              ),
            ])
          )
          // only created by me
          .where("a.identityProvider", "=", "fc")
          .where("a.userId", "=", "11124")
      );
    });
    console.log("Found arenas to notify", arenas.length);
    for (const arena of arenas) {
      // send reminder
      console.log("Sending reminder for arena", arena.id);
      await notifyArenaMembers(arena);
      await pgDb
        .updateTable("arena")
        .set({ lastNotifiedAt: now })
        .where("id", "=", arena.id)
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
