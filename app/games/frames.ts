/* eslint-disable react/jsx-key */
import { farcasterHubContext, openframes } from "frames.js/middleware";
import { createFrames } from "frames.js/next";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import { hubHttpUrl } from "../constants";
import { FramesMiddleware } from "frames.js/types";
import { validateFrameMessage } from "frames.js";

interface FrameValidationResult {
  isValid: boolean;
}

const validationMiddleware: FramesMiddleware<
  any,
  { validationResult?: FrameValidationResult }
> = async (ctx, next) => {
  const { request } = ctx;
  if (request.method !== "POST") {
    return next();
  }

  let payload;
  try {
    payload = await request.clone().json();
    if (isXmtpFrameActionPayload(payload)) {
      console.log("TODO");
      return next();
    }
  } catch (e) {
    return next();
  }

  // ignore message
  const { message, ...validationResult } = await validateFrameMessage(payload, {
    hubHttpUrl,
  });

  return next({ validationResult });
};

export type FrameState = {
  gameKey?: string;
  daily?: boolean;
};

const initialState: FrameState = {};

export const basePath = "/games";

export const frames = createFrames({
  basePath,
  initialState,
  middleware: [
    validationMiddleware,
    openframes({
      clientProtocol: {
        id: "xmtp",
        version: "2024-02-09",
      },
      handler: {
        isValidPayload: (body: JSON) => isXmtpFrameActionPayload(body),
        getFrameMessage: async (body: JSON) => {
          if (!isXmtpFrameActionPayload(body)) {
            return undefined;
          }
          const result = await getXmtpFrameMessage(body);

          return { ...result };
        },
      },
    }),
  ],
});
