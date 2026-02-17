import { externalBaseUrl, isPro } from "@/app/constants";
import { Metadata } from "next";
import { AppFrame } from "./app-frame";
import { ProfileApp } from "@/app/profiles/profile-app";
import { MiniAppEmbedNext } from "@farcaster/miniapp-node";
// import { Test } from "./test";

export async function generateMetadata({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const searchParams = await searchParamsPromise;
  const id = searchParams?.id;
  const cw = searchParams?.cw;

  const params = new URLSearchParams();
  if (id) {
    params.set("id", id.toString());
  }
  if (cw) {
    params.set("cw", cw.toString());
  }
  const paramsString = params.toString();

  const imageUrl = paramsString
    ? `${externalBaseUrl}/app/v2/frames/image?${paramsString}`
    : isPro
      ? `${externalBaseUrl}/init-pro.png`
      : `${externalBaseUrl}/init-v2.png`;
  const name = isPro ? "Framedl PRO" : "Framedl";
  const miniAppMetadata = JSON.stringify({
    version: "next",
    imageUrl,
    button: {
      title: "Play",
      action: {
        type: "launch_miniapp",
        name,
        url: `${externalBaseUrl}/app/v2${paramsString ? `?${paramsString}` : ""}`,
        splashImageUrl: isPro
          ? `${externalBaseUrl}/splash-pro.png`
          : `${externalBaseUrl}/splash-v2.png`,
        splashBackgroundColor: "#f3f0f9",
      },
    },
  } satisfies MiniAppEmbedNext);
  return {
    title: `${name} by ds8`,
    description: "Wordle in a mini app",
    other: {
      "fc:frame": miniAppMetadata,
      "fc:miniapp": miniAppMetadata,
    },
  };
}

export default async function Page({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await searchParamsPromise;
  const cwParam = searchParams?.cw as string | undefined;
  const gtParam = searchParams?.gt as string | undefined;
  const debugParam = searchParams?.dbg as string | undefined;
  const debugUrlParam = searchParams?.dbgUrl as string | undefined;
  const tsParam = searchParams?.ts as string | undefined;
  const gameType = gtParam ? gtParam : cwParam ? "custom" : "daily";
  // if (!debugParam) {
  //   return (
  //     <Test />
  //   )
  // }
  return (
    <div className="w-full h-dvh min-h-full">
      <ProfileApp headerless>
        <AppFrame
          gameType={gameType}
          debug={debugParam === "1" ? { debugUrl: debugUrlParam } : undefined}
          customWordId={cwParam}
          ts={tsParam}
        />
      </ProfileApp>
    </div>
  );
}
