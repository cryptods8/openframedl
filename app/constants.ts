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

const HUB_CONFIGS = [
  {
    httpUrl: "https://snapchain-api.neynar.com",
    requestOptions: {
      api_key: process.env["NEYNAR_API_KEY"] || "NEYNAR_FRAMES_JS",
      "x-api-key": process.env["NEYNAR_API_KEY"] || "NEYNAR_FRAMES_JS",
    },
  },
  {
    httpUrl: "https://hub.pinata.cloud",
    requestOptions: undefined,
  },
] as const;

const envHubHttpUrl = process.env["FRAME_HUB_HTTP_URL"];
const envHubRequestOptions = process.env["FRAME_HUB_REQUEST_OPTIONS"]
  ? JSON.parse(process.env["FRAME_HUB_REQUEST_OPTIONS"])
  : null;

export const hubHttpUrl = envHubHttpUrl || HUB_CONFIGS[0].httpUrl;
export const hubRequestOptions =
  envHubRequestOptions || HUB_CONFIGS[0].requestOptions;

export const isPro = process.env.FRAMEDL_PRO === "true";
