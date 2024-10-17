import { NextRequest } from "next/server";
import { createImageResponse } from "@/app/utils/image-response";

import { primaryColor } from "@/app/image-ui/image-utils";
import { verifyUrl } from "../../api-utils";
import { getWordForUserGameKey } from "../../../game/game-service";
import { GameIdentityProvider } from "../../../game/game-repository";
import { addDaysToDate, getDailyGameKey } from "../../../game/game-utils";

export const dynamic = "force-dynamic";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      tw="flex w-full h-full items-center justify-center bg-white"
      style={{
        fontFamily: "Inter",
        color: primaryColor(),
      }}
    >
      {children}
    </div>
  );
}

interface WordDetails {
  phonetic: string;
  meaning: string;
  partOfSpeech: string;
}

async function getWordDetails(word: string): Promise<WordDetails | null> {
  try {
    const resp = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    ).then((res) => res.json());
    const data = resp[0];
    const meaning = data.meanings[0];
    return {
      phonetic: data.phonetic,
      meaning: meaning.definitions[0].definition,
      partOfSpeech: meaning.partOfSpeech,
    };
  } catch (e) {
    console.error(e);
  }
  return null;
}

interface WotdImageProps extends WordDetails {
  date: string;
  word: string;
  overlayMessage?: string;
}

function WotdImage(props: WotdImageProps) {
  const { word, date, phonetic, partOfSpeech, meaning, overlayMessage } = props;
  return (
    <Layout>
      <div
        tw="flex flex-col text-4xl h-full w-full p-20 relative"
        style={{ gap: "3rem", backgroundColor: primaryColor(0.04) }}
      >
        <div
          tw="flex items-center"
          style={{
            fontFamily: "SpaceGrotesk",
            color: primaryColor(0.54),
            gap: "1rem",
          }}
        >
          <div tw="flex">
            <b>Framedl</b>
          </div>
          <div>&mdash;</div>
          <div>Word of the Day</div>
          <div>&mdash;</div>
          <div tw="flex">
            <b>{date}</b>
          </div>
        </div>
        <div tw="flex flex-col" style={{ gap: "3rem" }}>
          <div tw="flex flex-col" style={{ gap: "1rem" }}>
            <div tw="flex text-white text-6xl" style={{ gap: "0.5rem" }}>
              {word.split("").map((letter, i) => (
                <div
                  key={i}
                  tw="flex w-24 h-24 items-center justify-center"
                  style={{
                    backgroundColor: i > 4 ? primaryColor(0.2) : "green",
                    color: i > 4 ? primaryColor() : "white",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
          <div tw="flex flex-col" style={{ gap: "1rem" }}>
            <div
              tw="flex items-center"
              style={{ gap: "1rem", color: primaryColor(0.54) }}
            >
              <div tw="flex">{phonetic}</div>
              <div
                tw="flex h-3 w-3 rounded-full"
                style={{ backgroundColor: primaryColor(0.54) }}
              />
              <div tw="flex">{partOfSpeech}</div>
            </div>
            <div
              tw={`flex text-ellipsis overflow-hidden ${
                meaning.length > 110 ? "text-4xl" : "text-5xl"
              }`}
              style={{ lineHeight: "1.33", maxHeight: "12rem" }}
            >
              {meaning}
            </div>
          </div>
        </div>
        {overlayMessage && (
          <div
            tw="flex top-0 bottom-0 left-0 right-0 absolute items-end justify-center p-12"
            style={{ backgroundColor: primaryColor(0.54) }}
          >
            <div
              tw="flex rounded text-white px-12 py-8 text-5xl shadow-xl"
              style={{ backgroundColor: primaryColor() }}
            >
              {overlayMessage}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const allowedQueryParams = ["gk", "state", "uid", "ip"];

export async function GET(req: NextRequest) {
  const url = verifyUrl(req, allowedQueryParams);
  const params = url.searchParams;
  const gameKey =
    params.get("gk") || getDailyGameKey(addDaysToDate(new Date(), -1));
  const uid = params.get("uid") || "unimportant";
  const ip = params.get("ip") || "fc";
  const state = params.get("state");

  const { word } = await getWordForUserGameKey({
    gameKey,
    userId: uid,
    identityProvider: ip as GameIdentityProvider,
    isDaily: true,
  });
  const details = await getWordDetails(word);

  const overlayMessage =
    state === "UNPLAYED"
      ? "Play today's Framedl first!"
      : details === null
      ? "Failed to fetch word details :("
      : undefined;
  let imageProps: WotdImageProps;
  if (overlayMessage) {
    imageProps = {
      date: "Today",
      word: "Framedl",
      phonetic: "/fɹeɪmd(ə)l/",
      partOfSpeech: "verb",
      meaning: "Treat yourself with a word game",
      overlayMessage,
    };
  } else {
    imageProps = {
      date: gameKey,
      word,
      phonetic: details?.phonetic || "/???/",
      partOfSpeech: details?.partOfSpeech || "???",
      meaning: details?.meaning || "???",
    };
  }

  const resp = createImageResponse(<WotdImage {...imageProps} />);
  resp.headers.set("cache-control", "public, max-age=3600");
  return resp;
}
