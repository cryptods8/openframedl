import signed from "signed";
import { headers } from "next/headers";

export function currentURL(pathname: string): URL {
  const headersList = headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || "http";

  console.log("CURRENT URL", `${protocol}://${host}`);

  return new URL(pathname, `${protocol}://${host}`);
}

const signingKey = process.env["SIGNING_KEY"];
if (!signingKey) {
  throw new Error("SIGNING_KEY is required");
}

const signature = signed({ secret: signingKey });

export function signUrl(url: string): string {
  // console.log("SIGNING", url);
  return signature.sign(url);
}

export function verifySignedUrl(url: string): string {
  // console.log("VERIFYING", url);
  return signature.verify(url);
}

export function isUrlSigned(
  baseUrl: string,
  searchParams:
    | {
        [key: string]: string | string[] | undefined;
      }
    | undefined
) {
  const params = new URLSearchParams();
  for (const key in searchParams) {
    const value = searchParams[key];
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          params.append(key, v);
        }
      } else {
        params.append(key, value as string);
      }
    }
  }
  const paramsString = params.toString();
  const fullUrl = `${baseUrl}${paramsString ? `?${paramsString}` : ""}`;
  try {
    verifySignedUrl(fullUrl);
    return true;
  } catch (e) {
    // ignore
  }
  return false;
}

export async function timeCall<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const result = await fn();
  console.log(`Time for ${name}: ${Date.now() - start}ms`);
  return result;
}

export function createComposeUrl(text: string, url: string): string {
  const params = new URLSearchParams();
  params.set("text", text);
  params.set("embeds[]", url);
  return `https://warpcast.com/~/compose?${params.toString()}`;
}
