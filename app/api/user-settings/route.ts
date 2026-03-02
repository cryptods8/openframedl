import { NextResponse } from "next/server";
import { GameIdentityProvider } from "@/app/game/game-repository";
import {
  findUserSettingsByUserKey,
  getArenaNotifFrequency,
  insertUserSettings,
  mergeUserSettingsData,
  ArenaNotifFrequency,
} from "@/app/game/user-settings-pg-repository";
import { getFarcasterSession } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_FREQUENCIES: ArenaNotifFrequency[] = [
  "asap",
  "daily",
  "weekly",
  "never",
];

export async function GET() {
  const session = await getFarcasterSession();
  if (!session?.user?.fid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.fid;
  const identityProvider: GameIdentityProvider = "fc";
  const userKey = { userId, identityProvider };

  const settings = await findUserSettingsByUserKey(userKey);
  const arenaNotifFrequency = getArenaNotifFrequency(settings?.data);

  return NextResponse.json({ arenaNotifFrequency });
}

export async function POST(req: Request) {
  const session = await getFarcasterSession();
  if (!session?.user?.fid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { arenaNotifFrequency } = body;

  if (!ALLOWED_FREQUENCIES.includes(arenaNotifFrequency)) {
    return NextResponse.json(
      { error: "Invalid arenaNotifFrequency value" },
      { status: 400 },
    );
  }

  const userId = session.user.fid;
  const identityProvider: GameIdentityProvider = "fc";
  const userKey = { userId, identityProvider };

  const existing = await findUserSettingsByUserKey(userKey);

  if (existing) {
    await mergeUserSettingsData(userKey, { arenaNotifFrequency });
  } else {
    const now = new Date();
    await insertUserSettings({
      userId,
      identityProvider,
      createdAt: now,
      updatedAt: now,
      notificationsEnabled: false,
      notificationDetails: null,
      data: JSON.stringify({ arenaNotifFrequency }),
    });
  }

  return NextResponse.json({ arenaNotifFrequency });
}
