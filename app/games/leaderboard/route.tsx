/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { signUrl, createComposeUrl } from "../../utils";
import { frames } from "../frames";
import { getUserKeyFromContext } from "../message-utils";
import { getDailyGameKey } from "../../game/game-utils";

const constructLeaderboardSearchParams = (
  uid: string | undefined,
  ip: string | undefined,
  date: string | undefined,
  days: string | undefined
): URLSearchParams => {
  const params = new URLSearchParams();
  if (uid) {
    params.set("uid", uid);
  }
  if (ip) {
    params.set("ip", ip);
  }
  if (date) {
    params.set("date", date);
  }
  if (days) {
    params.set("days", days);
  }
  return params;
};

const urlWithParams = (url: string, params: URLSearchParams) => {
  const queryString = params.toString();
  return `${url}${queryString ? `?${queryString}` : ""}`;
};

const constructImageUrl = (url: string, searchParams: URLSearchParams) => {
  const imageUrl = urlWithParams(url, searchParams);
  return signUrl(imageUrl);
};

const handleRequest = frames(async (ctx) => {
  const { searchParams, validationResult } = ctx;

  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  let uidStr: string | undefined;
  let ipStr: string | undefined;
  let dateStr: string | undefined;
  let daysStr: string | undefined;
  const userKey = getUserKeyFromContext(ctx);
  if (userKey) {
    uidStr = userKey.userId;
    ipStr = userKey.identityProvider;
    dateStr = getDailyGameKey(new Date());
  } else {
    uidStr = searchParams.uid as string | undefined;
    ipStr = searchParams.ip as string | undefined;
    dateStr = searchParams.date as string | undefined;
    daysStr = searchParams.days as string | undefined;
  }

  const leaderboardSearchParams = constructLeaderboardSearchParams(
    uidStr,
    ipStr,
    dateStr,
    daysStr
  );
  const imageUrl = constructImageUrl(
    ctx.createUrl("/api/images/leaderboard"),
    leaderboardSearchParams
  );
  const leaderboardUrl = urlWithParams(
    ctx.createUrlWithBasePath("/leaderboard"),
    leaderboardSearchParams
  );
  const shareUrl = createComposeUrl("Framedl Leaderboard", leaderboardUrl);

  return {
    image: imageUrl,
    buttons: [
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
