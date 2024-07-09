import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import neynarClient from "./neynar-client";
import {
  findReminderByUserKey,
  insertReminder,
  updateReminder,
} from "../reminders/reminder-pg-repository";
import { UserKey } from "../../../game/game-repository";
import { DBReminderUpdate } from "../../../db/pg/types";
import { v4 as uuidv4 } from "uuid";

interface CastAuthor {
  fid: number;
  username: string;
}

type CastEventData = {
  object: "cast";
  hash: string;
  parent_hash: string;
  parent_url: string | null | undefined;
  root_parent_url: string | null | undefined;
  author: CastAuthor;
  parent_author: { fid: number } | null | undefined;
  text: string;
  timestamp: string;
};

type CastEvent = {
  created_at: number;
  type: "cast.created";
  data: CastEventData;
};

export async function POST(req: NextRequest, res: NextResponse) {
  const body = await req.text();

  const webhookSecret = process.env.NEYNAR_BOT_WEBHOOK_SECRET;

  if (
    !process.env.NEYNAR_SIGNER_UUID ||
    !process.env.NEYNAR_API_KEY ||
    !webhookSecret
  ) {
    throw new Error(
      "Make sure you set NEYNAR_SIGNER_UUID, NEYNAR_API_KEY and NEYNAR_BOT_WEBHOOK_SECRET in your .env file"
    );
  }

  const sig = req.headers.get("X-Neynar-Signature");
  if (!sig) {
    throw new Error("Neynar signature missing from request headers");
  }

  const hmac = createHmac("sha512", webhookSecret);
  hmac.update(body);
  const generatedSignature = hmac.digest("hex");

  const isValid = generatedSignature === sig;
  if (!isValid) {
    throw new Error("Invalid webhook signature");
  }

  const { data } = JSON.parse(body) as CastEvent;
  console.log("cast hash", data.hash);

  const text = data.text.toLowerCase();
  let userFid: number = data.author.fid;
  let castHash: string = data.hash;
  let username: string | undefined;
  if (/retry/i.test(text)) {
    if (data.parent_author?.fid && userFid === 11124) {
      userFid = data.parent_author.fid;
      castHash = data.parent_hash;
    } else {
      console.log("i don't know how to react to this message:", text);
      return NextResponse.json({});
    }
  } else if (!/setup\ reminders?/i.test(text)) {
    console.log("i don't know how to react to this message:", text);
    return NextResponse.json({});
  } else {
    username = data.author.username;
  }
  const userKey: UserKey = {
    userId: userFid.toString(),
    identityProvider: "fc",
  };
  const existingReminder = await findReminderByUserKey(userKey);
  const now = new Date();
  const logEntry = { timestamp: now.getTime(), enabled: true };
  if (existingReminder) {
    const reminder: DBReminderUpdate = {
      ...existingReminder,
      enabledAt: now,
      log: JSON.stringify([...existingReminder.log, logEntry]),
    };
    await updateReminder(existingReminder.id, reminder);
  } else {
    await insertReminder({
      ...userKey,
      createdAt: now,
      updatedAt: now,
      enabledAt: now,
      secret: uuidv4().replace(/-/g, ""),
      log: JSON.stringify([logEntry]),
    });
  }

  const greeting = username ? `Hey, @${username} 👋! ` : "Hey 👋!";
  const reply = await neynarClient.publishCast(
    process.env.NEYNAR_SIGNER_UUID,
    `${greeting} Your Framedl PRO reminders have been set up :)`,
    {
      replyTo: castHash,
    }
  );
  console.log("reply:", reply);

  return NextResponse.json({
    message: reply,
  });
}
