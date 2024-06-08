"use client";

import { useFormState } from "react-dom";
import { unsubscribe } from "./unsubscribe-action";
import { CheckCircleIcon } from "@heroicons/react/16/solid";
import { useFormStatus } from "react-dom";

function ReenableMessage() {
  return (
    <div className="text-sm text-primary-900/60 leading-normal flex flex-col gap-2">
      <span>To enable them again, just cast:</span>
      <code className="bg-primary-200 rounded px-2 py-1">
        @framedl setup reminders
      </code>{" "}
    </div>
  );
}

export function UnsubscribeForm({
  id,
  secret,
}: {
  id: number;
  secret: string;
}) {
  const [state, formAction] = useFormState(unsubscribe, {});
  const { pending } = useFormStatus();
  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4">
        <CheckCircleIcon className="fill-green-600 size-24" />
        <span>Your reminders have been successfully terminated 🤖</span>
        <ReenableMessage />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="leading-normal text-center">
        Are you sure you want to stop receiving reminders?
        <br />
        If so, hit the "Unsubscribe" button below. 👇
      </div>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="secret" value={secret} />
        <button
          className="bg-primary-800 w-full px-6 py-4 text-white font-bold rounded hover:bg-primary-900 active:bg-primary-950 [disabled]:bg-primary-800/50 [disabled]:cursor-not-allowed"
          type="submit"
          disabled={pending}
        >
          Unsubscribe
        </button>
      </form>
      {state.error && (
        <div className="text-red-600 text-sm">
          Uh oh, something went wrong. Please try again.
        </div>
      )}
      <ReenableMessage />
    </div>
  );
}
