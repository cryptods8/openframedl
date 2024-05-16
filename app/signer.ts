import signed from "signed";

const signingKey = process.env["SIGNING_KEY"];
if (!signingKey) {
  throw new Error("SIGNING_KEY is required");
}

const signature = signed({ secret: signingKey });

export function signUrl(url: string): string {
  return signature.sign(url);
}

export function verifySignedUrl(url: string): string {
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
