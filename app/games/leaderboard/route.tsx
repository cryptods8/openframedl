/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { baseUrl } from "../../constants";
import { signUrl, createComposeUrl } from "../../utils";
import { frames, basePath } from "../frames";
import { getUserKeyFromContext } from "../message-utils";

const constructLeaderboardSearchParams = (
  uid: string | undefined,
  ip: string | undefined
): URLSearchParams => {
  const params = new URLSearchParams();
  if (uid) {
    params.set("uid", uid);
  }
  if (ip) {
    params.set("ip", ip);
  }
  return params;
};

const urlWithParams = (url: string, params: URLSearchParams) => {
  const queryString = params.toString();
  return `${url}${queryString ? `?${queryString}` : ""}`;
};

const constructImageUrl = (searchParams: URLSearchParams) => {
  const imageUrl = urlWithParams(
    `${baseUrl}/api/images/leaderboard`,
    searchParams
  );
  return signUrl(imageUrl);
};

const handleRequest = frames(async (ctx) => {
  const { searchParams, validationResult } = ctx;

  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  let uidStr: string | undefined;
  let ipStr: string | undefined;
  const userKey = getUserKeyFromContext(ctx);
  if (userKey) {
    uidStr = userKey.userId;
    ipStr = userKey.identityProvider;
  } else {
    uidStr = searchParams.uid as string | undefined;
    ipStr = searchParams.ip as string | undefined;
  }

  const leaderboardSearchParams = constructLeaderboardSearchParams(
    uidStr,
    ipStr
  );
  const imageUrl = constructImageUrl(leaderboardSearchParams);
  const leaderboardUrl = urlWithParams(
    `${baseUrl}${basePath}/leaderboard`,
    leaderboardSearchParams
  );
  const shareUrl = createComposeUrl("Framedl Leaderboard", leaderboardUrl);

  return {
    image: imageUrl,
    buttons: [
      <Button action="post" target="..">
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
