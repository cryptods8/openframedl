import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const apiKey = process.env.NEYNAR_API_KEY;
if (!apiKey && process.env.NODE_ENV === "production") {
  throw new Error("Make sure you set NEYNAR_API_KEY in your .env file");
}

const neynarClient = new NeynarAPIClient({
  apiKey: apiKey || "NEYNAR_FRAMES_JS",
});

export default neynarClient;
