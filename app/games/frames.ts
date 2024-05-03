import { openframes } from "frames.js/middleware";
import { createFrames } from "frames.js/next";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import { baseUrl, externalBaseUrl, hubHttpUrl } from "../constants";
import { FramesMiddleware } from "frames.js/types";
import { validateFrameMessage } from "frames.js";
import { maintenanceMiddleware } from "./maintenanceMiddleware";
import { signUrl } from "../utils";
import { UserKey } from "../game/game-repository";

interface FrameValidationResult {
  isValid: boolean;
}

type CreateUrlFunctionArgs =
  | string
  | { pathname?: string; query?: Record<string, string> };
type CreateUrlFunction = (arg: CreateUrlFunctionArgs) => string;

const userKeyMiddleware: FramesMiddleware<any, { userKey?: UserKey }> = async (
  ctx,
  next
) => {
  const { clientProtocol, message, validationResult } = ctx as any;
  if (
    !clientProtocol ||
    !message ||
    (validationResult && !validationResult.isValid)
  ) {
    return next();
  }
  switch (clientProtocol.id) {
    case "xmtp":
      return next({
        userKey: {
          identityProvider: "xmtp",
          userId: message.verifiedWalletAddress!,
        },
      });
    case "farcaster":
      return next({
        userKey: {
          identityProvider: "fc",
          userId: message.requesterFid!.toString(),
        },
      });
    default:
      console.warn("invalid clientProtocol id", clientProtocol.id);
  }
  return next();
};

const urlBuilderMiddleware: FramesMiddleware<
  any,
  {
    createUrl: CreateUrlFunction;
    createUrlWithBasePath: CreateUrlFunction;
    createSignedUrl: CreateUrlFunction;
    createExternalUrl: CreateUrlFunction;
  }
> = async (ctx, next) => {
  const provideCreateUrl = (withBasePath: boolean, customBaseUrl?: string) => {
    const bUrl = customBaseUrl ?? baseUrl;
    return (arg: CreateUrlFunctionArgs) => {
      if (typeof arg === "string") {
        const pathname = withBasePath ? `${ctx.basePath}${arg}` : arg;
        return `${bUrl}${pathname}`;
      }
      const { pathname, query } = arg;
      const fullPathname = withBasePath
        ? `${ctx.basePath}${pathname ?? ""}`
        : pathname;
      const url = new URL(fullPathname ?? "", bUrl);
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
    createSignedUrl: (arg: CreateUrlFunctionArgs) => {
      const url = provideCreateUrl(false)(arg);
      return signUrl(url);
    },
    createExternalUrl: provideCreateUrl(false, externalBaseUrl),
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
    maintenanceMiddleware,
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
    userKeyMiddleware,
  ],
});
