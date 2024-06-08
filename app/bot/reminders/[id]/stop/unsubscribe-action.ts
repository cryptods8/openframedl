"use server";

import {
  findReminderById,
  updateReminder,
} from "../../../../api/bot/reminders/reminder-pg-repository";

export interface UnsubcsribeResult {
  ok?: boolean;
  error?: string;
}

export async function unsubscribe(
  _: UnsubcsribeResult,
  formData: FormData
): Promise<UnsubcsribeResult> {
  const strId = formData.get("id");
  const secret = formData.get("secret");
  if (!strId || !secret) {
    return { error: "Invalid" };
  }
  const id = parseInt(strId.toString(), 10);
  try {
    const reminder = await findReminderById(id);
    if (!reminder) {
      return { error: "Not found" };
    }
    if (reminder.secret !== secret) {
      return { error: "Not allowed" };
    }
    if (reminder.enabledAt !== null) {
      await updateReminder(id, {
        ...reminder,
        enabledAt: null,
        log: JSON.stringify([
          ...reminder.log,
          { enabled: false, timestamp: Date.now() },
        ]),
      });
    }
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { error: "Error" };
  }
}
