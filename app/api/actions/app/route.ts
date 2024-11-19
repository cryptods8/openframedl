import { externalBaseUrl, isPro } from "@/app/constants";
import { createCustomFrames } from "@/app/games/frames";
import { loadUserData } from "@/app/games/user-data";
import { signJwt } from "@/app/lib/jwt";

const appBaseUrl = `${externalBaseUrl}/app`;

export const GET = async () => {
  return Response.json({
    type: "composer",
    action: {
      type: "post",
    },
    icon: "play",
    name: isPro ? "Framedl PRO" : "Framedl",
    aboutUrl: appBaseUrl,
    description: isPro ? "Play Framedl PRO" : "Play Framedl",
    imageUrl: `${externalBaseUrl}${isPro ? "/pro-icon.png" : "/app/icon.png"}`,
  });
};

const frames = createCustomFrames({});

export const POST = frames(async (ctx) => {
  const url = new URL(appBaseUrl);

  if (!ctx.userKey) {
    console.error("User data not found!");
    throw new Error("User data not found!");
  }

  const userData = await loadUserData(ctx.userKey);
  const jwt = signJwt({ userData, userKey: ctx.userKey });
  url.searchParams.set("jwt", jwt);

  return Response.json({
    type: "form",
    title: isPro ? "Play Framedl PRO" : "Play Framedl",
    url: url.toString(),
  });
});
