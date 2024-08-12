export interface DirectCast {
  recipientFid: number;
  message: string;
  idempotencyKey: string;
}

const RETRY_DELAY = 1000 * 60 * 5;
const RETRY_ATTEMPTS = 3;

export async function sendDirectCastWithRetries(cast: DirectCast) {
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    try {
      if (i > 0) {
        console.log(`Retrying reminder send attempt ${i + 1}`, cast);
      }
      await sendDirectCast(cast);
      return;
    } catch (e) {
      console.error("Failed to send reminder", e);
      if (i < RETRY_ATTEMPTS - 1) {
        const retryDelay = RETRY_DELAY / 2 + Math.random() * RETRY_DELAY;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  console.error(`Failed to send reminder after ${RETRY_ATTEMPTS} attempts`);
  return;
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
