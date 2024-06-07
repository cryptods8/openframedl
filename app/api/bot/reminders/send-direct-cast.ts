export interface DirectCast {
  recipientFid: number;
  message: string;
  idempotencyKey: string;
}

export async function sendDirectCast(cast: DirectCast) {
  const apiKey = process.env.WARPCAST_DC_API_KEY;

  fetch("https://api.warpcast.com/v2/ext-send-direct-cast", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cast),
  });
}
