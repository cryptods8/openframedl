"use client";

import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/16/solid";

export function BadgePageClient({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary-900/10 hover:bg-primary-900/15 transition-colors cursor-pointer"
      >
        {copied ? (
          <>
            <CheckIcon className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <ClipboardIcon className="w-4 h-4" />
            Copy link
          </>
        )}
      </button>
    </div>
  );
}
