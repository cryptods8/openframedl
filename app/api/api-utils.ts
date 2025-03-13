import { NextRequest } from "next/server";
import { baseUrl } from "../constants";
import { verifySignedUrl } from "../signer";
import { getUserInfoFromJwtOrSession } from "../lib/auth";
import { UserData } from "../game/game-repository";

export function getRequestUrl(req: NextRequest, allowedQueryParams: string[]) {
  const url = new URL(req.url);
  // remove extra query params
  const urlParams = url.searchParams;
  for (const param of urlParams.keys()) {
    if (!allowedQueryParams.includes(param) && param !== "signed") {
      urlParams.delete(param);
    }
  }

  const search = urlParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

export function verifyUrl(req: NextRequest, allowedQueryParams: string[]) {
  const url = getRequestUrl(req, allowedQueryParams);
  const verifiedUrl = verifySignedUrl(url);
  return new URL(verifiedUrl);
}

export interface BaseUserRequest {
  identityProvider?: "fc_unauth" | "anon";
  userId?: string;
  userData?: UserData;
}

export async function getUserInfoFromRequest(req: Request, body: BaseUserRequest) {
  if (
    (body.identityProvider === "fc_unauth" ||
      body.identityProvider === "anon") &&
    body.userId
  ) {
    return {
      userData: { ...body.userData, passOwnership: undefined },
      userKey: {
        userId: body.userId,
        identityProvider: body.identityProvider,
      },
    };
  }
  const jwt = req.headers.get("Authorization")?.split(" ")[1];
  return getUserInfoFromJwtOrSession(jwt);
}
