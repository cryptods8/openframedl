import { ParseWebhookEvent, parseWebhookEvent } from "@farcaster/miniapp-node";
import { NextRequest } from "next/server";
import { sendFrameNotifications } from "@/app/utils/send-frame-notifications";
import { UserKey } from "@/app/game/game-repository";
import {
  findUserSettingsByUserKey,
  insertUserSettings,
  updateUserSettings,
} from "@/app/game/user-settings-pg-repository";
import { DBUserSettings } from "@/app/db/pg/types";
import { createVerifyAppKey } from "@/app/lib/hub";

async function setUserNotificationDetails(
  userKey: UserKey,
  userSettings: DBUserSettings | undefined,
  notificationDetails: { token: string; url: string }
) {
  if (userSettings) {
    await updateUserSettings(userKey, {
      notificationDetails: JSON.stringify(notificationDetails),
      notificationsEnabled: true,
      updatedAt: new Date(),
    });
  } else {
    await insertUserSettings({
      ...userKey,
      notificationDetails: JSON.stringify(notificationDetails),
      notificationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function deleteUserNotificationDetails(
  userKey: UserKey,
  userSettings: DBUserSettings | undefined
) {
  if (!userSettings) {
    return;
  }
  await updateUserSettings(userKey, {
    notificationsEnabled: false,
    updatedAt: new Date(),
  });
}

export async function POST(request: NextRequest) {
  const requestJson = await request.json();

  const verifyAppKeyWithHub = createVerifyAppKey();

  let data;
  try {
    data = await parseWebhookEvent(requestJson, verifyAppKeyWithHub);
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;

    switch (error.name) {
      case "VerifyJsonFarcasterSignature.InvalidDataError":
      case "VerifyJsonFarcasterSignature.InvalidEventDataError":
        // The request data is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
        // The app key is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
        // Internal error verifying the app key (caller may want to try again)
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
    }
  }

  const fid = data.fid;
  const event = data.event;

  const userKey: UserKey = {
    userId: fid.toString(),
    identityProvider: "fc",
  };

  const userSettings = await findUserSettingsByUserKey(userKey);

  switch (event.event) {
    case "frame_added":
      if (event.notificationDetails) {
        await setUserNotificationDetails(
          userKey,
          userSettings,
          event.notificationDetails
        );
        await sendFrameNotifications({
          recipients: [{ fid, notificationDetails: event.notificationDetails }],
          title: "Welcome to Framedl",
          body: "Framedl is now added to your frames",
        });
      } else {
        await deleteUserNotificationDetails(userKey, userSettings);
      }

      break;
    case "frame_removed":
      await deleteUserNotificationDetails(userKey, userSettings);

      break;
    case "notifications_enabled":
      await setUserNotificationDetails(
        userKey,
        userSettings,
        event.notificationDetails
      );
      await sendFrameNotifications({
        recipients: [{ fid, notificationDetails: event.notificationDetails }],
        title: "Framedl notifications enabled",
        body: "You'll now receive daily reminders to play",
      });

      break;
    case "notifications_disabled":
      await deleteUserNotificationDetails(userKey, userSettings);

      break;
  }

  return Response.json({ success: true });
}
