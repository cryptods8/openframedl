export const isProduction = process.env["VERCEL_ENV"] === "production";
const fallbackBaseUrl = isProduction
  ? "https://framedl.vercel.app"
  : "http://localhost:3000";

export const baseUrl =
  process.env["NEXT_PUBLIC_HOST"] ||
  process.env["BASE_URL"] ||
  process.env["VERCEL_URL"] ||
  fallbackBaseUrl;

export const externalBaseUrl =
  process.env["NEXT_PUBLIC_EXTERNAL_BASE_URL"] ||
  process.env["EXTERNAL_BASE_URL"] ||
  baseUrl;

const fallbackHubHttpUrl = isProduction
  ? undefined
  : "https://hub.pinata.cloud"; //"http://localhost:3010/hub";

const airstackApiKey = process.env["AIRSTACK_API_KEY"];

export const hubHttpUrl = airstackApiKey
  ? "https://hubs.airstack.xyz"
  : process.env["FRAME_HUB_HTTP_URL"] || fallbackHubHttpUrl;
export const hubRequestOptions = airstackApiKey
  ? {
      headers: { "x-airstack-hubs": airstackApiKey },
    }
  : undefined;

export const isPro = process.env.FRAMEDL_PRO === "true";
