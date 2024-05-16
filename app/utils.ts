// import { headers } from "next/headers";
import { baseUrl } from "./constants";

export function currentURL(pathname: string): URL {
  return new URL(pathname, baseUrl);
  // if (process.env.NEXT_PUBLIC_HOST) {
  //   return new URL(pathname, process.env.NEXT_PUBLIC_HOST);
  // }
  // const headersList = headers();
  // const host = headersList.get("x-forwarded-host") || headersList.get("host");
  // const protocol = headersList.get("x-forwarded-proto") || "http";

  // console.debug("current url", `${protocol}://${host}`);

  // return new URL(pathname, `${protocol}://${host}`);
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
