import { externalBaseUrl } from "@/app/constants";
import { createCustomFrames } from "@/app/games/frames";
import { loadUserData } from "@/app/games/user-data";
import { signJwt } from "@/app/lib/jwt";
import { NextRequest } from "next/server";

const appBaseUrl = `${externalBaseUrl}/app`;

export const GET = async (req: NextRequest) => {
  return Response.json({
    type: "composer",
    action: {
      type: "post",
    },
    icon: "play",
    name: "Framedl",
    aboutUrl: appBaseUrl,
    description: "Create Framedl",
    imageUrl: `${appBaseUrl}/icon.png`,
  });
};

const frames = createCustomFrames({});

export const POST = frames(async (ctx) => {
  const url = new URL(`${appBaseUrl}/arena/create`);

  if (!ctx.userKey) {
    console.error("User data not found!");
    throw new Error("User data not found!");
  }

  const userData = await loadUserData(ctx.userKey);
  const jwt = signJwt({ userData, userKey: ctx.userKey });
  url.searchParams.set("jwt", jwt);

  return Response.json({
    type: "form",
    title: "Create Framedl",
    url: url.toString(),
  });
});
