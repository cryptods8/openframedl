export const isProduction = process.env["VERCEL_ENV"] === "production";
const fallbackBaseUrl = isProduction
  ? "https://framedl.vercel.app"
  : "http://localhost:3000";

export const baseUrl =
  process.env["NEXT_PUBLIC_HOST"] ||
  process.env["BASE_URL"] ||
  process.env["VERCEL_URL"] ||
  fallbackBaseUrl;

export const externalBaseUrl = process.env["EXTERNAL_BASE_URL"] || baseUrl;

const fallbackHubHttpUrl = isProduction
  ? undefined
  : "http://localhost:3010/hub";

export const hubHttpUrl =
  process.env["FRAME_HUB_HTTP_URL"] || fallbackHubHttpUrl;

export const isPro = process.env.FRAMEDL_PRO === "true";
