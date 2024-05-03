import { Metadata } from "next";
import Link from "next/link";

import { createComposeUrl, currentURL } from "../utils";
import { fetchMetadata } from "frames.js/next";
import { basePath } from "../games/frames";
import { externalBaseUrl } from "../constants";

export async function generateMetadata(): Promise<Metadata> {
  const framesUrl = currentURL(`${basePath}/custom`);
  const other = await fetchMetadata(framesUrl);
  return {
    title: "Framedl by ds8",
    description: "Wordle in a frame",
    other,
  };
}

export default function Page() {
  const url = new URL("/custom", externalBaseUrl);
  const composeUrl = createComposeUrl("", url.toString());

  return (
    <div>
      Hello!{" "}
      <Link href={composeUrl} className="underline hover:text-slate-700">
        Create a custom Framedl game
      </Link>
    </div>
  );
}
