import { CoreMiddleware, openframes } from "frames.js/middleware";
import { createFrames as coreCreateFrames } from "frames.js/core";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import {
  baseUrl,
  externalBaseUrl,
  hubHttpUrl,
  hubRequestOptions,
} from "../constants";
import {
  CreateFramesFunctionDefinition,
  FrameHandlerFunction,
  FramesMiddleware,
  FramesOptions,
  FramesRequestHandlerFunctionOptions,
  JsonValue,
} from "frames.js/types";
import { validateFrameMessage } from "frames.js";
import { maintenanceMiddleware } from "./maintenanceMiddleware";
import { signUrl } from "../signer";
import { UserKey } from "../game/game-repository";
import { NextRequest, NextResponse } from "next/server";

interface FrameValidationResult {
  isValid: boolean;
}

type CreateUrlFunctionArgs =
  | string
  | { pathname?: string; query?: Record<string, string | undefined> };
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
    createSignedUrlWithBasePath: CreateUrlFunction;
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
          if (value != null) {
            url.searchParams.set(key, value);
          }
        }
      }
      return url.toString();
    };
  };
  return next({
    createUrl: provideCreateUrl(false),
    createUrlWithBasePath: provideCreateUrl(true),
    createSignedUrl: (arg: CreateUrlFunctionArgs) => {
      const url = provideCreateUrl(false, externalBaseUrl)(arg);
      return signUrl(url);
    },
    createSignedUrlWithBasePath: (arg: CreateUrlFunctionArgs) => {
      const url = provideCreateUrl(true, externalBaseUrl)(arg);
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
    hubRequestOptions,
  });

  return next({ validationResult });
};

export type FrameState = {
  gameKey?: string;
  daily?: boolean;
};

const initialState: FrameState = {};

export const basePath = "/games";

export class NextRequestWithContext extends NextRequest {
  ctx: NextContext;
  constructor(input: URL | RequestInfo, ctx: NextContext, init?: RequestInit) {
    super(
      input,
      init ? { ...init, signal: init?.signal || undefined } : undefined
    );
    this.ctx = ctx;
  }

  get nextContext(): NextContext {
    return this.ctx;
  }
}

interface NextContext {
  params: Record<string, string | undefined>;
}

type CreateFramesForNextJS = CreateFramesFunctionDefinition<
  CoreMiddleware,
  (req: NextRequest, ctx: NextContext) => Promise<NextResponse>
>;

// @ts-expect-error -- this is correct but the function does not satisfy the type
const createFrames: CreateFramesForNextJS = function createFramesNJS(
  options?: FramesOptions<any, any>
) {
  const frames = coreCreateFrames(options);

  return function createHandler<
    TPerRouteMiddleware extends FramesMiddleware<any, any>[]
  >(
    handler: FrameHandlerFunction<any, any>,
    handlerOptions?: FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
  ) {
    const handleRequest = frames(handler, handlerOptions);

    return (req: NextRequest, ctx: NextContext) => {
      return handleRequest(new NextRequestWithContext(req, ctx));
    };
  };
};

const customRequestMiddleware: FramesMiddleware<
  any,
  { request: NextRequestWithContext }
> = async (ctx, next) => {
  const { request } = ctx;
  return next({ request: request as NextRequestWithContext });
};

export const createCustomFrames = <T extends JsonValue>(
  customInitialState: T
) =>
  createFrames({
    basePath,
    initialState: customInitialState,
    middleware: [
      customRequestMiddleware,
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

export const frames = createCustomFrames(initialState);
