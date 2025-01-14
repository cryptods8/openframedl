import { externalBaseUrl, isPro } from "@/app/constants";
import { Metadata } from "next";
import { AppFrame } from "./app-frame";
import { ProfileApp } from "@/app/profiles/profile-app";
import { NextServerPageProps } from "frames.js/next/types";
// import { Test } from "./test";

export async function generateMetadata({
  searchParams,
}: NextServerPageProps): Promise<Metadata> {
  const id = searchParams?.id;

  const imageUrl = id
    ? `${externalBaseUrl}/app/v2/frames/image?id=${id}`
    : `${externalBaseUrl}/init-v2.png`;
  return {
    title: "Framedl by ds8",
    description: "Wordle in a frame",
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl,
        button: {
          title: "Play",
          action: {
            type: "launch_frame",
            name: "Framedl",
            url: `${externalBaseUrl}/app/v2`,
            splashImageUrl: `${externalBaseUrl}/splash-v2.png`,
            splashBackgroundColor: "#f3f0f9",
          },
        },
      } satisfies FrameEmbed),
    },
  };
}

export default function Page({ searchParams }: NextServerPageProps) {
  const gtParam = searchParams?.gt as string | undefined;
  const debugParam = searchParams?.dbg as string | undefined;
  const debugUrlParam = searchParams?.dbgUrl as string | undefined;
  // if (!debugParam) {
  //   return (
  //     <Test />
  //   )
  // }
  return (
    <div className="w-full h-dvh min-h-full">
      <ProfileApp headerless>
        <AppFrame
          config={{
            externalBaseUrl: externalBaseUrl,
            isPro,
          }}
          gameType={gtParam || "daily"}
          debug={debugParam === "1" ? { debugUrl: debugUrlParam } : undefined}
        />
      </ProfileApp>
    </div>
  );
}

type FrameEmbed = {
  // Frame spec version. Required.
  // Example: "next"
  version: "next";

  // Frame image. Must be 3:2 aspect ratio. Must be less than 10 MB.
  // Example: "https://yoink.party/img/start.png"
  imageUrl: string;

  // Button attributes
  button: {
    // Button text. Required.
    // Example: "Yoink Flag"
    title: string;

    // Action attributes
    action: {
      // Action type. Must be "launch_frame".
      type: "launch_frame";

      // App name.
      // Example: "Yoink!"
      name: string;

      // Frame launch URL.
      // Example: "https://yoink.party/"
      url: string;

      // 200x200px splash image URL. Must be less than 1MB.
      // Example: "https://yoink.party/img/splash.png"
      splashImageUrl: string;

      // Hex color code.
      // Example: "#eeeee4"
      splashBackgroundColor: string;
    };
  };
};
