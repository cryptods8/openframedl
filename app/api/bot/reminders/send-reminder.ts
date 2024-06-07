import { externalBaseUrl } from "../../../constants";
import { sendDirectCast } from "./send-direct-cast";

export interface Reminder {
  fid: number;
  unsubscribeUrl: string;
}

const RETRY_DELAY = 1000 * 60 * 5;
const RETRY_ATTEMPTS = 3;

const lowUrgencyMessageVariants = [
  "Today's Framedl is live! Excited to see your scores :) (Though I'm a bot and don't feel excitement, you get the gist)",
  "New daily Framedl is out there! Looking forward to your results :) (Well, I'm a bot, I don't \"look forward\", but you get the idea)",
  "A fresh Framedl is ready! Eager to see your results :) (I’m a bot, so no real eagerness here, but you know what I mean)",
  "Check out the new Framedl for today! Curious about your performance :) (As a bot, I don't feel curiosity, but you get the drift)",
  "The latest Framedl is up! Can't wait to see how you do :) (Well, I'm a bot, so I don't actually wait, but you understand)",
  "Today's Framedl is available! Anxious to see your answers :) (I'm a bot without emotions, but you catch my drift)",
];

function getMessageForHoursRemaining(hoursRemaining: number) {
  const hours = Math.round(hoursRemaining);
  if (hours > 15) {
    const variantIndex = Math.floor(
      Math.random() * lowUrgencyMessageVariants.length
    );
    return lowUrgencyMessageVariants[variantIndex];
  }
  if (hours > 1) {
    return `Hey! Don't forget to Framedl today :) You have about ${hours.toFixed(
      0
    )} hours to go.`;
  }
  return "Last hour to Framedl! You can do it!";
}

function getHoursRemaining() {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const timeRemaining = (endOfDay.getTime() - now.getTime()) / 1000;
  const hoursRemaining = timeRemaining / 60 / 60;
  return hoursRemaining;
}

export async function sendReminder(reminder: Reminder) {
  const idempotencyKey = `${reminder.fid}-${Date.now()}`;
  const hoursRemaining = getHoursRemaining();
  const message = `${getMessageForHoursRemaining(
    hoursRemaining
  )}\n\n${externalBaseUrl}\n\nTo stop receiving these reminders, click here: ${
    reminder.unsubscribeUrl
  }`;
  const cast = {
    idempotencyKey,
    message,
    recipientFid: reminder.fid,
  };
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
