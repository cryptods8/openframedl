import {
  SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/frame-sdk";
import { externalBaseUrl } from "../constants";

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

interface NotificationDetails {
  token: string;
  url: string;
}
interface Notification {
  recipients: {
    fid: number;
    notificationDetails: NotificationDetails;
  }[];
  title: string;
  body: string;
}

async function sendNotification({
  title,
  body,
  url,
  tokens,
}: {
  title: string;
  body: string;
  url: string;
  tokens: string[];
}): Promise<SendFrameNotificationResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notificationId: crypto.randomUUID(),
      title,
      body,
      targetUrl: `${externalBaseUrl}/app/v2`,
      tokens: tokens,
    } satisfies SendNotificationRequest),
  });

  const responseJson = await response.json();

  if (response.status === 200) {
    const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
    if (responseBody.success === false) {
      // Malformed response
      return { state: "error", error: responseBody.error.errors };
    }

    if (responseBody.data.result.rateLimitedTokens.length) {
      // Rate limited
      return { state: "rate_limit" };
    }

    return { state: "success" };
  } else {
    // Error response
    return { state: "error", error: responseJson };
  }
}

export async function sendFrameNotifications({
  recipients,
  title,
  body,
}: Notification): Promise<SendFrameNotificationResult[]> {
  const urlMap = recipients.reduce((acc, recipient) => {
    const { token, url } = recipient.notificationDetails;
    if (token && url) {
      if (!acc[url]) {
        acc[url] = [];
      }
      acc[url]!.push(token);
    }
    return acc;
  }, {} as Record<string, string[]>)

  const promises = Object.entries(urlMap).map(([url, tokens]) =>
    sendNotification({ title, body, url, tokens })
  );

  return Promise.all(promises);
}
