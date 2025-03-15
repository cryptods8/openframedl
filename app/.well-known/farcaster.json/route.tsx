import { NextResponse } from "next/server";

// @ts-ignore
import { externalBaseUrl, isProduction, isPro } from "@/app/constants";

const accountAssociation = isProduction
  ? isPro
    ? {
        header:
          "eyJmaWQiOjExMTI0LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4ZENjODlEZjVGYzhENDJDNTQ0MzM4ODUzMWFGMTU1MUUwRmJkNUNBZCJ9",
        payload: "eyJkb21haW4iOiJwcm8uZnJhbWVkbC54eXoifQ",
        signature:
          "MHg1NzBmNGFkMmViMGViNDQxNTFmY2YzMWYyOGMzMmQyZThlMTBhZTNhZTUzMDUyNjg1NjM3ODg3NWYyNGE0MDEzNmQyNjVmZjU3NjM0NGU0NzczMTA2YWZmZTUyZTE5MjdiNjZlYTRjODYwYjc1MmU1NDVmMWFkMTJhNDA0MjdlYjFj",
      }
    : {
        header:
          "eyJmaWQiOjExMTI0LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4ZENjODlEZjVGYzhENDJDNTQ0MzM4ODUzMWFGMTU1MUUwRmJkNUNBZCJ9",
        payload: "eyJkb21haW4iOiJmcmFtZWRsLnh5eiJ9",
        signature:
          "MHhhMzljN2EzZTJiZmU1NmZjZDM4YTgxNDkxMjk4YjcxZGZkNTk0ZmJmODBjN2I0YmUwNGU5ZjUwMTYyZjYyZTgzNDliNDllZGNjNjgzM2M0MmZiODZlNDMyMDNkYmU3YzlkZGJkNjJiYWU1M2Q5ZDllODY1YTk3MDk1YmMwODMzZTFj",
      }
  : {
      header:
        "eyJmaWQiOjExMTI0LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4ZENjODlEZjVGYzhENDJDNTQ0MzM4ODUzMWFGMTU1MUUwRmJkNUNBZCJ9",
      payload: "eyJkb21haW4iOiJmcm1kbC50dW5uLmRldiJ9",
      signature:
        "MHhhZThjODMxNTc1ZjAzMzkzZTA0MGNhNjE5ODhjMmUwZDQ0OTBmYTNmZmQ0NDMyYjIwYjU2MzhhOTM0MmMzOTdlMzZjNDJkYTIzODU4MjY1MmZkNjI5MTI4ZmU1YTkyNzQ4MTNiZTkwOGE3ZDRjYzQ1NWVmZjFiNjA4YjMwZTk5MjFj",
    };

export async function GET() {
  const manifest = {
    accountAssociation,
    frame: {
      version: "1",
      name: isPro ? "Framedl PRO" : "Framedl",
      tagline: isPro ? "Competitive Wordle in a frame" : "Wordle in a frame",
      imageUrl: isPro
        ? `${externalBaseUrl}/init-pro.png`
        : `${externalBaseUrl}/init-v2.png`,
      buttonTitle: "Play",
      iconUrl: isPro
        ? `${externalBaseUrl}/icon-pro.png`
        : `${externalBaseUrl}/icon-v2.png`,
      splashImageUrl: isPro
        ? `${externalBaseUrl}/splash-pro.png`
        : `${externalBaseUrl}/splash-v2.png`,
      splashBackgroundColor: "#f3f0f9",
      homeUrl: `${externalBaseUrl}/app/v2`,
      webhookUrl: `${externalBaseUrl}/api/frames/v2/webhook`,
    },
  };
  return NextResponse.json(manifest);
}
