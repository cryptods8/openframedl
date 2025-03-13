import { externalBaseUrl, isPro } from "@/app/constants";
import { gameService } from "@/app/game/game-service";
import { formatGameKey, getDailyGameKey } from "@/app/game/game-utils";
import { options } from "@/app/generate-image";
import { BasicLayout } from "@/app/image-ui/basic-layout";
import { GameBoard } from "@/app/image-ui/game-board";
import { primaryColor, lightColor } from "@/app/image-ui/image-utils";
import { ImageResponse } from "@vercel/og";
import { NextResponse } from "next/server";

function RepeatText({ text, count, filler }: { text: string; count: number; filler?: boolean }) {
  function Filler() {
    return (
      <div
        tw="flex flex-1 bg-red-500 h-1 rounded-full"
        style={{ backgroundColor: lightColor(0.24) }}
      />
    );
  }
  return (
    <div
      tw="flex items-center justify-center py-5 text-3xl w-full"
      style={{
        gap: "3rem",
        overflow: "hidden",
        fontWeight: 700,
        color: filler ? lightColor(0.36) : lightColor(0.86),
      }}
    >
      <div></div>
      {filler && <Filler />}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          tw="flex items-center justify-center"
          style={{ gap: "3rem" }}
        >
          <div>{text}</div>
          {/* {i < count - 1 && <div key={`${i}-separator`}>{"·"}</div>} */}
        </div>
      ))}
      {filler && <Filler />}
      <div></div>
    </div>
  );
}

export async function GET(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;

    const game = await gameService.load(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 }
      );
    }
    if (game.arenaId) {
      return NextResponse.json(
        { success: false, error: "Game is an arena game" },
        { status: 400 }
      );
    }
    if (game.isCustom) {
      return NextResponse.json(
        { success: false, error: "Game is a custom game" },
        { status: 400 }
      );
    }

    const todayKey = getDailyGameKey(new Date());
    const canRevealWord = isPro || !game.isDaily || game.gameKey < todayKey;

    // Set cache duration based on game status and word reveal
    const cacheDuration =
      !game.completedAt || !canRevealWord
        ? 60 * 60 * 24 // 24 hours in seconds
        : 60 * 60 * 24 * 30; // 30 days in seconds

    const formattedGameKey = formatGameKey(game);
    const username = game.userData?.username || game.userId;
    const framedlTitle = isPro ? "Framedl PRO" : "Framedl";
    // Generate the NFT image
    const resp = new ImageResponse(
      (
        <BasicLayout>
          <div
            tw="flex flex-col w-full h-full items-center justify-between relative font-space p-20"
            style={{
              // backgroundImage: `radial-gradient(circle, green 0%, #1D1434 100%)`,
              backgroundImage: `radial-gradient(circle, #5E3FA6 0%, #1D1434 100%)`,
              fontFamily: "SpaceGrotesk",
            }}
          >
            <div
              tw="flex absolute bottom-0 left-0 right-0"
              style={{
                transform: "translateX(20px) translateY(78px) rotate(270deg)",
                // background: "red",
                transformOrigin: "top left",
              }}
            >
              <RepeatText text={framedlTitle} count={1} filler />
            </div>

            <div
              tw="flex absolute bottom-0 left-0 right-0"
              style={{
                transform: "translateX(-20px) translateY(78px) rotate(90deg)",
                transformOrigin: "top right",
              }}
            >
              <RepeatText text={framedlTitle} count={1} filler />
            </div>

            <div tw="flex absolute top-0 left-0 right-0">
              <RepeatText text={formattedGameKey} count={1} />
            </div>
            <div tw="flex absolute bottom-0 left-0 right-0">
              <RepeatText text={username} count={1} />
            </div>

            <div tw="flex items-center justify-center bg-white rounded-lg shadow-xl">
              <GameBoard
                game={game}
                reveal={canRevealWord ? "correct_word" : "none"}
                // dark
              />
            </div>

            {/* <div tw="flex absolute top-0 bottom-0 left-0 right-0" style={{ maskImage: `linear-gradient(165deg, black 400px, transparent 400px)` }}>
              <div tw="w-full h-full rounded-lg" style={{ backgroundImage: `radial-gradient(circle at 128px 64px, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 400px)` }} />
            </div> */}
          </div>
        </BasicLayout>
      ),
      {
        ...options,
        width: 800,
        height: 800,
      }
    );
    resp.headers.set(
      "Cache-Control",
      `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}`
    );
    return resp;
  } catch (error) {
    console.error("Error generating game NFT image:", error);
    return new NextResponse("Error generating image", { status: 500 });
  }
}
