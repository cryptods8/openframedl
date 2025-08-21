/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { createComposeUrl } from "../../utils";
import { signUrl } from "../../signer";
import { frames } from "../frames";
import { getUserKeyFromContext } from "../message-utils";
import { toLeaderboardSearchParams } from "../../leaderboard/leaderboard-utils";
import { getDailyGameKey } from "../../game/game-utils";
import { isPro } from "@/app/constants";
import { gameService } from "@/app/game/game-service";
import { GameIdentityProvider } from "@/app/game/game-repository";

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

const handleRequest = frames(async (ctx) => {
  const { searchParams, validationResult, message } = ctx;

  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  const userKey = getUserKeyFromContext(ctx);
  const leaderboardSearchParams = toLeaderboardSearchParams(searchParams);
  const isTopN = searchParams.type === "TOP_N";
  if (userKey) {
    leaderboardSearchParams.set("uid", userKey.userId);
    leaderboardSearchParams.set("ip", userKey.identityProvider);
    const inputStr = message?.inputText;
    if (isTopN) {
      const n = parseInt(
        inputStr || leaderboardSearchParams.get("n") || "30",
        10
      );
      if (n > 0) {
        leaderboardSearchParams.set("n", n.toString());
      }
    } else if (!leaderboardSearchParams.has("date")) {
      let dateStr: string;
      const parts = inputStr?.trim().split(/\s*,\s*/) || [];
      const datePart = parts[0];
      let daysPart = parts[1];
      if (datePart?.match(/^20\d{2}-\d{2}-\d{2}$/g)) {
        dateStr = datePart;
      } else {
        daysPart = datePart;
        dateStr = getDailyGameKey(new Date());
      }
      const days = Math.min(parseInt(daysPart || "0", 10), 100);
      if (daysPart && days > 0) {
        leaderboardSearchParams.set("days", days.toString());
      }
      leaderboardSearchParams.set("date", dateStr);
    }
  }

  const imageUrl = constructImageUrl(
    ctx.createUrl("/api/images/leaderboard"),
    leaderboardSearchParams
  );
  const leaderboardUrl = urlWithParams(
    ctx.createExternalUrl("/leaderboard"),
    leaderboardSearchParams
  );

  let shareText = "Framedl Leaderboard";
  if (searchParams.type !== "TOP_N" && searchParams.prize) {
    const date = leaderboardSearchParams.get("date") ?? getDailyGameKey(new Date());
    const days = searchParams.days ? parseInt(searchParams.days, 10) : undefined;
    const prize = parseInt(searchParams.prize, 10);
    const ipParam = (searchParams.ip ?? "fc") as GameIdentityProvider;
    const leaderboard = await gameService.loadLeaderboard(ipParam, {
      date,
      days,
      type: "DATE_RANGE",
    });

    const res: { score: number; people: string[] }[] = [];
    let count = 0;
    for (let i = 0; i < leaderboard.entries.length; i++) {
      const entry = leaderboard.entries[i]!;
      const prev = res[res.length - 1];
      const person = entry.userData?.username ? `@${entry.userData.username}` : `@!${entry.userId}`;
      if (!prev || prev.score !== entry.totalGuessCount) {
        if (count >= 3) {
          break;
        }
        res.push({ score: entry.totalGuessCount, people: [person] });
      } else {
        prev.people.push(person);
      }
      count++;
    }

    let pos = 1;
    let peopleText = "";
    let basePrize = prize / 7;
    let remainingPrize = prize;
    for (let i = 0; i < res.length; i++) {
      const entry = res[i]!;
      const peopleCount = entry.people.length;
      const totalRungValue = getTotalRungValue(pos - 1, peopleCount)
      const allocatedPrize = totalRungValue * basePrize;
      const personPrize = Math.ceil(allocatedPrize / peopleCount);
      for (let j = 0; j < peopleCount; j++) {
        const person = entry.people[j]!;
        peopleText += `${pos}) ${person} (${personPrize})\n`;
      }
      remainingPrize -= allocatedPrize;
      pos += peopleCount;
    }

    shareText = `framedl${isPro ? " pro" : ""} results ${date}\n\n${peopleText}`;
    console.log('SHARE TEXT', shareText);
  }
  const shareUrl = createComposeUrl(shareText, imageUrl);

  return {
    image: imageUrl,
    textInput: isTopN
      ? "Enter number of games"
      : "Enter date (e.g. 2024-04-01)",
    buttons: [
      <Button
        action="post"
        target={ctx.createUrlWithBasePath({
          pathname: "/leaderboard",
          query: { type: isTopN ? "TOP_N" : "DATE_RANGE" },
        })}
      >
        Confirm
      </Button>,
      <Button
        action="post"
        target={ctx.createUrlWithBasePath({
          pathname: "/leaderboard",
          query: {
            type: isTopN ? "DATE_RANGE" : "TOP_N",
          },
        })}
      >
        {isTopN ? "Daily" : "Top N"}
      </Button>,
      <Button action="post" target={ctx.createUrlWithBasePath("/..")}>
        Play Framedl
      </Button>,
      <Button action="link" target={shareUrl}>
        Share
      </Button>,
    ],
  };
});

export const POST = handleRequest;
export const GET = handleRequest;
