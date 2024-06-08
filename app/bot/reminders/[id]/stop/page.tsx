import { NextServerPageProps } from "frames.js/next/types";
import { findReminderById } from "../../../../api/bot/reminders/reminder-pg-repository";
import { UnsubscribeForm } from "./unsubscribe-form";

export default async function Page({
  params,
  searchParams,
}: NextServerPageProps) {
  const id = parseInt(params.id!, 10);
  const secret = searchParams?.secret;
  const reminder = await findReminderById(id);
  if (!secret || isNaN(id) || !reminder || secret !== reminder.secret) {
    const message = "Are you sure you've got the right link? 🤖";
    return <div>{message}</div>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <UnsubscribeForm id={id} secret={secret} />
    </div>
  );
}
