/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { getUserDataForFid } from "frames.js";
import { frames } from "../../../frames";
import {
  externalBaseUrl,
  hubHttpUrl,
  hubRequestOptions,
} from "@/app/constants";
import { saveChampionshipSignup } from "@/app/game/championship-signup-pg-repository";
import { createComposeUrl } from "@/app/utils";

const handle = frames(async (ctx) => {
  const { message, validationResult, searchParams } = ctx;
  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  //
  const fid = message?.requesterFid;
  let signupId: number | undefined;
  const srcId = searchParams?.sid ? parseInt(searchParams.sid, 10) : null;
  if (fid) {
    const options = { hubHttpUrl, hubRequestOptions };
    const userData = await getUserDataForFid({
      fid,
      options,
    });
    console.log("SRC", srcId);
    signupId = await saveChampionshipSignup({
      userId: fid.toString(),
      identityProvider: "fc",
      roundNumber: 1,
      userData: userData ? JSON.stringify(userData) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      srcId,
    });
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
      },
    });
  } else {
    imageUrl = ctx.createUrl("/signup/initial.png");
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
