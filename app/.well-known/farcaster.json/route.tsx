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
  const ogImageUrl = isPro
    ? `${externalBaseUrl}/og-image-pro.png`
    : `${externalBaseUrl}/og-image.png`; // same as heroImageUrl

  const manifest = {
    accountAssociation,
    frame: {
      version: "1",
      // store listing
      iconUrl: isPro
        ? `${externalBaseUrl}/icon-pro.png`
        : `${externalBaseUrl}/icon-v2.png`,
      name: isPro ? "Framedl PRO" : "Framedl",
      subtitle: isPro
        ? "Daily competitive wordle game"
        : "Daily wordle game mini app", // 30 characters, no emojis or special characters
      // store page
      description:
        "Guess a word in 6 tries. The word changes every day. Share your results on Farcaster.", // 170 characters, no emojis or special characters
      // screenshotUrls: [], // Visual previews of the app, max 3 screens, Portrait, 1284 x 2778
      // search & discovery
      primaryCategory: "games", // One of the pre-defined categories: games, social, finance, utility, productivity, health-fitness, news-media, music, shopping, education, developer-tools, entertainment, art-creativity
      tags: isPro
        ? ["leaderboard", "prize", "degen", "wordle", "game"]
        : ["leaderboard", "competitive", "wordle", "game", "logic"], // Use 3–5 high-volume terms; no spaces, no repeats, no brand names. Use singular form.
      // promotional assets
      heroImageUrl: ogImageUrl, // Promotional display image on top of the mini app store, 1200 x 630px (1.91:1)
      tagline: isPro ? "Guess a word in 6 tries" : "Guess a word in 6 tries", // Use for time-sensitive promos or CTAs. Keep copy active (e.g., “Grow, Raid & Rise in Stoke Fire”). 30 characters
      // sharing
      ogTitle: isPro ? "Framedl PRO" : "Framedl", // 30 characters
      ogDescription:
        "Guess a word in 6 tries. The word changes every day. Share your results on Farcaster.", // 100 characters
      ogImageUrl, // same as heroImageUrl
      imageUrl: isPro
        ? `${externalBaseUrl}/init-pro.png`
        : `${externalBaseUrl}/init-v2.png`,
      buttonTitle: "Play",
      splashImageUrl: isPro
        ? `${externalBaseUrl}/splash-pro.png`
        : `${externalBaseUrl}/splash-v2.png`,
      splashBackgroundColor: "#f3f0f9",
      homeUrl: `${externalBaseUrl}/app/v2`,
      webhookUrl: `${externalBaseUrl}/api/frames/v2/webhook`,
    },
    baseBuilder: {
      allowedAddresses: ["0xD322Cb0aD9e29Bb121Aa3DB089A2C7def441F168"],
    },
  };
  return NextResponse.json(manifest);
}
