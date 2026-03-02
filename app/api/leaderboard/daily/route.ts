import { createComposeUrl } from "../../../utils";
import { signUrl } from "../../../signer";
import { toLeaderboardSearchParams } from "../../../leaderboard/leaderboard-utils";
import { getDailyGameKey } from "../../../game/game-utils";
import { externalBaseUrl, isPro } from "@/app/constants";
import { gameService } from "@/app/game/game-service";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { NextRequest, NextResponse } from "next/server";

const urlWithParams = (url: string, params: URLSearchParams) => {
  const queryString = params.toString();
  return `${url}${queryString ? `?${queryString}` : ""}`;
};

const constructImageUrl = (url: string, searchParams: URLSearchParams) => {
  const imageUrl = urlWithParams(url, searchParams);
  return signUrl(imageUrl);
};

function getTotalRungValue(i: number, peopleCount: number): number {
  if (peopleCount <= 0 || i >= 3) {
    return 0;
  }
  if (i === 0) {
    return 4 + getTotalRungValue(i + 1, peopleCount - 1);
  }
  if (i === 1) {
    return 2 + getTotalRungValue(i + 1, peopleCount - 1);
  }
  if (i === 2) {
    return 1 + getTotalRungValue(i + 1, peopleCount - 1);
  }
  return 0;
}

function getPiBonusMultiplier(score: number): number {
  const diff = 3.14 - Math.floor(score * 100) / 100;
  if (diff < 0) {
    return 0;
  }
  return 1 + Math.floor(diff / 0.07);
}

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);

  const leaderboardSearchParams = toLeaderboardSearchParams(searchParams);

  // In this route, we don't have userKey from context, so we skip the user-specific logic
  // that was present in the frame handler (setting uid/ip based on context).
  // The caller is expected to provide necessary params in the query string if needed.

  // Also skipping the message.inputText parsing logic as this is a GET request.
  // We assume params are passed correctly.

  const imageUrl = constructImageUrl(
    new URL("/api/images/leaderboard", externalBaseUrl).toString(),
    leaderboardSearchParams
  );

  let shareText = "Framedl Leaderboard";

  // Replicating logic from app/games/leaderboard/route.tsx
  // Check if we should generate detailed share text
  if (searchParams.type !== "TOP_N" && searchParams.prize) {
    const date =
      leaderboardSearchParams.get("date") ??
      getDailyGameKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const days = searchParams.days
      ? parseInt(searchParams.days as string, 10)
      : undefined;
    const prize = parseInt(searchParams.prize as string, 10);
    const ipParam = (searchParams.ip ?? "fc") as GameIdentityProvider;
    const piBonus = searchParams.piBonus ? parseInt(searchParams.piBonus as string, 10) : 50;

    // Determine type - the loaded logic seems to default to DATE_RANGE for prize calculation if structured this way
    // In original code: const leaderboard = await gameService.loadLeaderboard(...)
    const leaderboard = await gameService.loadLeaderboard(ipParam, {
      date,
      days,
      type: "DATE_RANGE", // Original code hardcodes this when entering this block
    });
    const res: { score: number; people: { name: string; isOg: boolean }[] }[] = [];
    let count = 0;
    const leaderboardDays = 'days' in leaderboard.metadata ? leaderboard.metadata.days : 14;
    for (let i = 0; i < leaderboard.entries.length; i++) {
      const entry = leaderboard.entries[i]!;
      const prev = res[res.length - 1];
      const isOg = entry.userData?.passOwnership === "BASIC_AND_OG" || entry.userData?.passOwnership === "OG"
      const name = entry.userData?.username
        ? `@${entry.userData.username}`
        : `@!${entry.userId}`;
      if (!prev || prev.score !== entry.totalGuessCount) {
        if (count >= 3) {
          break;
        }
        res.push({ score: entry.totalGuessCount, people: [{ name, isOg }] });
      } else {
        prev.people.push({ name, isOg });
      }
      count++;
    }

    let pos = 1;
    let peopleText = "";
    let basePrize = prize / 7;
    // Unused in loop but part of logic: let remainingPrize = prize;

    for (let i = 0; i < res.length; i++) {
      const entry = res[i]!;
      const peopleCount = entry.people.length;
      const totalRungValue = getTotalRungValue(pos - 1, peopleCount);
      const allocatedPrize = totalRungValue * basePrize;
      for (let j = 0; j < peopleCount; j++) {
        const person = entry.people[j]!;
        const prizeCoef = person.isOg ? 1 : 0.5;
        const personPrize = Math.ceil((allocatedPrize * prizeCoef) / peopleCount);
        const bonus = Math.ceil(getPiBonusMultiplier(entry.score / leaderboardDays) * piBonus * prizeCoef / peopleCount);
        peopleText += `${pos}) ${person.name} (${personPrize + bonus})\n`;
      }
      // remainingPrize -= allocatedPrize;
      pos += peopleCount;
    }

    shareText = `framedl${
      isPro ? " pro" : ""
    } results ${date}\n\n${peopleText}\ncongrats to all`;
  }

  const shareUrl = createComposeUrl(shareText, imageUrl);

  return NextResponse.redirect(shareUrl);
}
