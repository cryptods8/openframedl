import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const apiKey = process.env.NEYNAR_API_KEY || "NEYNAR_FRAMES_JS";

const neynarClient = new NeynarAPIClient({
  apiKey,
});

export default neynarClient;
