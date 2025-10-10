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

export interface HubConfig {
  httpUrl: string;
  requestOptions: RequestInit | undefined;
}

const DEFAULT_HUB_CONFIGS: HubConfig[] = [
  {
    httpUrl: "https://hub.merv.fun",
    requestOptions: undefined,
  },
  {
    httpUrl: "https://hub.pinata.cloud",
    requestOptions: undefined,
  },
  {
    httpUrl: "https://snapchain-api.neynar.com",
    requestOptions: {
      headers: {
        api_key: process.env["NEYNAR_API_KEY"] || "NEYNAR_FRAMES_JS",
        "x-api-key": process.env["NEYNAR_API_KEY"] || "NEYNAR_FRAMES_JS",
      },
    },
  },
] as const;

const envHubHttpUrl = process.env["FRAME_HUB_HTTP_URL"];
const envHubRequestOptions =
  process.env["FRAME_HUB_REQUEST_OPTIONS"] && envHubHttpUrl
    ? JSON.parse(process.env["FRAME_HUB_REQUEST_OPTIONS"])
    : null;

export const hubConfigs: HubConfig[] = envHubHttpUrl
  ? [
      { httpUrl: envHubHttpUrl, requestOptions: envHubRequestOptions },
      ...DEFAULT_HUB_CONFIGS,
    ]
  : DEFAULT_HUB_CONFIGS;

export const hubHttpUrl = hubConfigs[0]!.httpUrl;
export const hubRequestOptions = hubConfigs[0]!.requestOptions;

export const isPro = process.env.FRAMEDL_PRO === "true";
