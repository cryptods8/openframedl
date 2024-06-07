import { NextServerPageProps } from "frames.js/next/types";
import {
  findReminderById,
  updateReminder,
} from "../../../../api/bot/reminders/reminder-pg-repository";
import { CheckCircleIcon } from "@heroicons/react/16/solid";

export default async function Page({
  params,
  searchParams,
}: NextServerPageProps) {
  const id = parseInt(params.id!, 10);
  const secret = searchParams?.secret;
  const reminder = await findReminderById(id);
  if (!secret || isNaN(id) || !reminder || secret !== reminder.secret) {
    return <div>Are you sure you've got the right link? 🤖</div>;
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

  return (
    <div className="flex flex-col items-center gap-4">
      <CheckCircleIcon className="fill-green-600 size-24" />
      <span>Your notifications have been successfully terminated 🤖</span>
      <div className="text-sm text-primary-900/60 leading-normal flex flex-col gap-2">
        <span>To enable them again, just cast:</span>
        <code className="bg-primary-200 rounded px-2 py-1">
          @framedl setup reminders
        </code>{" "}
      </div>
    </div>
  );
}
