import { findReminderById } from "../../../../api/bot/reminders/reminder-pg-repository";
import { UnsubscribeForm } from "./unsubscribe-form";

export default async function Page({
  params,
  searchParams: searchParamsPromise,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { id } = await params;
  const searchParams = await searchParamsPromise;
  const idNum = parseInt(id!, 10);
  const secret = searchParams?.secret;
  const reminder = await findReminderById(idNum);
  if (!secret || isNaN(idNum) || !reminder || secret !== reminder.secret) {
    const message = "Are you sure you've got the right link? 🤖";
    return <div>{message}</div>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <UnsubscribeForm id={idNum} secret={secret} />
    </div>
  );
}
