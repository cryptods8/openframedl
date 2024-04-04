import { openframes } from "frames.js/middleware";
import { createFrames } from "frames.js/next";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import { baseUrl, hubHttpUrl } from "../constants";
import { FramesMiddleware } from "frames.js/types";
import { validateFrameMessage } from "frames.js";

interface FrameValidationResult {
  isValid: boolean;
}

type CreateUrlFunctionArgs =
  | string
  | { pathname?: string; query?: Record<string, string> };
type CreateUrlFunction = (arg: CreateUrlFunctionArgs) => string;

const urlBuilderMiddleware: FramesMiddleware<
  any,
  { createUrl: CreateUrlFunction; createUrlWithBasePath: CreateUrlFunction }
> = async (ctx, next) => {
  const provideCreateUrl = (withBasePath: boolean) => {
    return (arg: CreateUrlFunctionArgs) => {
      if (typeof arg === "string") {
        const pathname = withBasePath ? `${ctx.basePath}${arg}` : arg;
        return `${baseUrl}${pathname}`;
      }
      const { pathname, query } = arg;
      const fullPathname = withBasePath
        ? `${ctx.basePath}${pathname ?? ""}`
        : pathname;
      const url = new URL(fullPathname ?? "", baseUrl);
      if (query) {
        for (const [key, value] of Object.entries(query)) {
          url.searchParams.set(key, value);
        }
      }
      return url.toString();
    };
  };
  return next({
    createUrl: provideCreateUrl(false),
    createUrlWithBasePath: provideCreateUrl(true),
  });
};

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
      // console.log("TODO");
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
    urlBuilderMiddleware,
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
