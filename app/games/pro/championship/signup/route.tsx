/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../../../frames";
import {
  externalBaseUrl,
} from "@/app/constants";
import {
  findChampionshipSignupByUserId,
  saveChampionshipSignup,
} from "@/app/game/championship-signup-pg-repository";
import { createComposeUrl } from "@/app/utils";
import { loadUserData } from "@/app/games/user-data";

const handle = frames(async (ctx) => {
  const { message, validationResult, searchParams } = ctx;
  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  //
  const fid = message?.requesterFid;
  let signupId: number | undefined;
  const srcId = searchParams?.sid ? parseInt(searchParams.sid, 10) : null;
  let alreadySignedUp: boolean = false;
  if (fid) {
    const userKey = { userId: fid.toString(), identityProvider: "fc" as const };
    const userData = await loadUserData(userKey);
    const existingSignup = await findChampionshipSignupByUserId(
      fid.toString(),
      "fc",
      2
    );
    if (existingSignup) {
      signupId = existingSignup.id;
      alreadySignedUp = true;
    } else {
      signupId = await saveChampionshipSignup({
        ...userKey,
        roundNumber: 2,
        userData: userData ? JSON.stringify(userData) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        srcId,
      });
    }
  } else if (srcId) {
    signupId = srcId;
  }

  let imageUrl: string;
  if (signupId) {
    imageUrl = ctx.createUrl({
      pathname: "/api/images/pro/championship/signup",
      query: {
        sid: signupId.toString(),
        shr: fid ? "0" : "1",
        as: alreadySignedUp ? "1" : "0",
      },
    });
  } else {
    imageUrl = ctx.createUrl("/signup/initial-xmas-2024.png");
  }

  const signedUp = !!message?.requesterFid;
  if (signedUp) {
    const shareUrl = createComposeUrl(
      "",
      `${externalBaseUrl}/games/pro/championship/signup?sid=${signupId}`
    );
    return {
      image: imageUrl,
      buttons: [
        <Button
          action="link"
          target={`${externalBaseUrl}/championship/ranking?suo=0&uid=${fid}&sid=${signupId}`}
        >
          See ranking
        </Button>,
        <Button action="link" target={shareUrl}>
          Share with friends
        </Button>,
      ],
    };
  }

  return {
    image: imageUrl,
    buttons: [
      <Button
        action="post"
        target={ctx.createUrlWithBasePath({
          pathname: "/pro/championship/signup",
          query: srcId ? { sid: srcId.toString() } : {},
        })}
      >
        {"I'm in!"}
      </Button>,
    ],
  };
});

export const POST = handle;
export const GET = handle;
