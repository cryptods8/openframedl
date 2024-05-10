import { NextRequest } from "next/server";
import { baseUrl } from "../constants";
import { verifySignedUrl } from "../utils";

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
