import { pgDb } from "@/app/db/pg/pg-db";
import { findArenasWithGames } from "@/app/game/arena-pg-repository";
import {
  PublicArena,
  toPublicArena,
  toPublicArenaWithGames,
} from "@/app/games/arena/arena-utils";
import { getArenaAvailabilityProperties } from "@/app/games/arena/arena-utils";
import { getUserInfoFromJwtOrSession } from "@/app/lib/auth";
import { sql } from "kysely";
import { NextRequest, NextResponse } from "next/server";

export type ArenaFilter = "mine" | "open" | "past" | "upcoming";

export interface ArenaListRequest {
  page?: number;
  limit?: number;
  filter?: ArenaFilter;
}

export interface PublicArenaListItem extends PublicArena {
  completedCount: number;
  gameCount: number;
  totalGameCount: number;
  firstStartedAt: Date | null;
  endsAt: Date | null;
}

export interface ArenaListResponse {
  arenas: PublicArenaListItem[];
}

export async function GET(req: NextRequest) {
  try {
    const jwt = req.headers.get("Authorization")?.split(" ")[1];
    const { userData, userKey, anonymous } = await getUserInfoFromJwtOrSession(
      jwt
    );
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const filter = searchParams.get("ft") as ArenaFilter | null;

    if (filter === "mine" && anonymous) {
      return NextResponse.json(
        { error: "Invalid filter: mine - no user present" },
        { status: 400 }
      );
    }

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    const now = new Date();

    const arenas = await pgDb
      .with("arena_game_stats", (db) =>
        db
          .selectFrom("game")
          .select((db) => [
            "arenaId",
            db.fn.count<number>("id").as("gameCount"),
            db.fn
              .sum<number>(
                db
                  .case()
                  .when("status", "in", ["WON", "LOST"])
                  .then(1)
                  .else(0)
                  .end()
              )
              .as("completedCount"),
            db.fn.min<Date>("createdAt").as("firstStartedAt"),
          ])
          .where("arenaId", "is not", null)
          .groupBy("arenaId")
      )
      .with("arena_meta", (db) =>
        db
          .selectFrom("arena as a")
          .leftJoin("arena_game_stats as ags", "a.id", "ags.arenaId")
          .select((db) => [
            "a.id",
            db.fn.coalesce("ags.gameCount", db.val(0)).as("gameCount"),
            db.fn
              .coalesce("ags.completedCount", db.val(0))
              .as("completedCount"),
            db
              .eb(
                sql<number>`jsonb_array_length(a.config->'words')::int`,
                "*",
                sql<number>`(a.config->>'audienceSize')::int`
              )
              .as("totalGameCount"),
            "ags.firstStartedAt",
            db
              .case()
              .when(sql<number>`a.config->'start'->>'date'`, "is", null)
              .then(db.val(null))
              .else(
                sql<Date>`(a.config->'start'->>'date')::timestamp`
              )
              .end()
              .as("startAt"),
            db
              .case()
              .when(
                sql<string>`(config->'duration'->>'type')::text`,
                "=",
                "unlimited"
              )
              .then(db.val(null))
              .when(
                db.fn.coalesce("a.startedAt", "ags.firstStartedAt"),
                "is",
                null
              )
              .then(db.val(null))
              .else(
                db.eb(
                  db.fn.coalesce("a.startedAt", "ags.firstStartedAt"),
                  "+",
                  sql<Date>`(config->'duration'->>'minutes' || ' minutes')::interval`
                )
              )
              .end()
              .as("endsAt"),
          ])
      )
      .selectFrom("arena")
      .leftJoin("arena_meta as am", "arena.id", "am.id")
      .selectAll("arena")
      .select((db) => [
        "am.gameCount",
        "am.completedCount",
        "am.totalGameCount",
        "am.firstStartedAt",
        "am.endsAt",
      ])
      .where((db) => {
        const conditions = [];
        if (filter === "mine") {
          conditions.push(
            db
              .eb("userId", "=", userKey.userId)
              .and(db.eb("identityProvider", "=", userKey.identityProvider))
          );
        } else if (filter === "open") {
          conditions.push(
            db.and([
              db.eb("am.completedCount", "<", db.ref("am.totalGameCount")),
              db.or([
                db.eb("am.endsAt", "is", null),
                db.eb("am.endsAt", ">", now),
              ]),
              db.or([
                db.eb(
                  db.fn.coalesce(
                    "am.startAt",
                    "arena.startedAt",
                    "am.firstStartedAt"
                  ),
                  "is",
                  null
                ),
                db.eb(
                  db.fn.coalesce(
                    "am.startAt",
                    "arena.startedAt",
                    "am.firstStartedAt"
                  ),
                  "<",
                  now
                ),
              ]),
            ])
          );
        } else if (filter === "past") {
          conditions.push(
            db.or([
              db.eb("am.completedCount", ">=", db.ref("am.totalGameCount")),
              db.and([
                db.eb("am.endsAt", "is not", null),
                db.eb("am.endsAt", "<", now),
              ]),
            ])
          );
        } else if (filter === "upcoming") {
          conditions.push(
            db.and([
              db.eb("am.startAt", "is not", null),
              db.eb("am.startAt", ">", now),
            ])
          );
        }
        return db.and(conditions);
      })
      .limit(limit)
      .offset(offset)
      .orderBy("createdAt", "desc")
      .execute();

    const publicArenas = arenas
      .map((arena) => {
        const publicArena = toPublicArena(arena);
        // const availability = getArenaAvailabilityProperties(arena, anonymous ? undefined : userKey);
        return {
          ...publicArena,
          gameCount: arena.gameCount ?? 0,
          completedCount: arena.completedCount ?? 0,
          totalGameCount: arena.totalGameCount ?? 0,
          firstStartedAt: arena.firstStartedAt,
          endsAt: arena.endsAt,
          // availability
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      arenas: publicArenas,
      page,
      limit,
      hasMore: publicArenas.length === limit,
    });
  } catch (error) {
    console.error("Error fetching arenas:", error);
    return NextResponse.json(
      { error: "Failed to fetch arenas" },
      { status: 500 }
    );
  }
}
