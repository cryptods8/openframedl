import { NextRequest, NextResponse } from "next/server";
import { Reminder, sendReminder } from "../../../bot/reminders/send-reminder";
import { insertReminder } from "../../../bot/reminders/reminder-pg-repository";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(req: NextRequest) {
  if (!ADMIN_SECRET) {
    console.error("Admin secret not set");
    return NextResponse.json({ message: "Auth error" }, { status: 401 });
  }
  try {
    const apiKey = req.headers.get("x-framedl-api-key");
    if (apiKey !== ADMIN_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const type = req.nextUrl.searchParams.get("type") || "send";
    if (type === "send") {
      const body = (await req.json()) as Reminder;
      sendReminder(body);
      return NextResponse.json({ message: "Sent" });
    }
    if (type === "create") {
      const now = new Date();
      const logEntry = { timestamp: now.getTime(), enabled: true };
      insertReminder({
        userId: "123",
        identityProvider: "fc",
        secret: "test",
        createdAt: now,
        updatedAt: now,
        enabledAt: now,
        log: JSON.stringify([logEntry]),
      });
      return NextResponse.json({ message: "Created" });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error occured" }, { status: 500 });
  }
}
