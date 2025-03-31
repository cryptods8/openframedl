import { externalBaseUrl } from "../../../constants";
import { getDailyGameKey } from "../../../game/game-utils";
import { sendDirectCastWithRetries } from "./send-direct-cast";

export interface Reminder {
  fid: number;
  unsubscribeUrl: string;
}

const lowUrgencyMessageVariants = [
  "Today's Framedl is live! Excited to see your scores :)",
  "New daily Framedl is out there! Looking forward to your results :)",
  "A fresh Framedl is ready! Eager to see your results :)",
  "Check out the new Framedl for today! Curious about your performance :)",
  "The latest Framedl is up! Can't wait to see how you do :)",
  "Today's Framedl is available! Anxious to see your answers :)",
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
  endOfDay.setUTCHours(23, 59, 59, 999);
  const timeRemaining = (endOfDay.getTime() - now.getTime()) / 1000;
  const hoursRemaining = timeRemaining / 60 / 60;
  return hoursRemaining;
}

export async function sendReminder(reminder: Reminder) {
  const now = new Date();
  const idempotencyKey = `${reminder.fid}-${now.getTime()}`;
  const hoursRemaining = getHoursRemaining();
  const gameKey = getDailyGameKey(now);
  const message = `${getMessageForHoursRemaining(
    hoursRemaining
  )}\n\nFramedl ${gameKey}\n${externalBaseUrl}/app/v2\n\nTo stop receiving these reminders, click here: ${
    reminder.unsubscribeUrl
  }`;
  const cast = {
    idempotencyKey,
    message,
    recipientFid: reminder.fid,
  };
  await sendDirectCastWithRetries(cast);
  return;
}
