/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { createComposeUrl } from "../../utils";
import { signUrl } from "../../signer";
import { frames } from "../frames";
import { getUserKeyFromContext } from "../message-utils";
import { toLeaderboardSearchParams } from "../../leaderboard/leaderboard-utils";
import { getDailyGameKey } from "../../game/game-utils";

const urlWithParams = (url: string, params: URLSearchParams) => {
  const queryString = params.toString();
  return `${url}${queryString ? `?${queryString}` : ""}`;
};

const constructImageUrl = (url: string, searchParams: URLSearchParams) => {
  const imageUrl = urlWithParams(url, searchParams);
  return signUrl(imageUrl);
};

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
  const shareUrl = createComposeUrl("Framedl Leaderboard", leaderboardUrl);

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
