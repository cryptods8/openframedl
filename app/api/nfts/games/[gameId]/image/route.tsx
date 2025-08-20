import { isPro } from "@/app/constants";
import { gameService } from "@/app/game/game-service";
import { formatGameKey, getDailyGameKey } from "@/app/game/game-utils";
import { options } from "@/app/generate-image";
import { BasicLayout } from "@/app/image-ui/basic-layout";
import { GameBoard } from "@/app/image-ui/game-board";
import { lightColor } from "@/app/image-ui/image-utils";
import { createImageResponse } from "@/app/utils/image-response";
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
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const isPreview = new URL(request.url).searchParams.get("preview") === "true";
  const startTime = Date.now();
  console.log(`[NFT Image] Starting generation for gameId: ${gameId}`);
  
  try {
    // console.log(`[NFT Image] Loading game data - ${Date.now() - startTime}ms`);
    const gameLoadStart = Date.now();
    const game = await gameService.load(gameId);
    // console.log(`[NFT Image] Game data loaded in ${Date.now() - gameLoadStart}ms`);
    
    if (!game) {
      // console.log(`[NFT Image] Game not found - ${Date.now() - startTime}ms`);
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 }
      );
    }

    const todayKey = getDailyGameKey(new Date());
    const canRevealWord = !game.isCustom && !game.arenaId && (!game.isDaily || (isPro || game.gameKey < todayKey));

    // Set cache duration based on game status and word reveal
    const cacheDuration =
      !game.completedAt || !canRevealWord
        ? 60 * 60 * 24 // 24 hours in seconds
        : 60 * 60 * 24 * 30; // 30 days in seconds

    const formattedGameKey = formatGameKey(game);
    const username = game.userData?.username || game.userId;
    const framedlTitle = isPro ? "Framedl PRO" : "Framedl";
    
    // console.log(`[NFT Image] Starting image generation - ${Date.now() - startTime}ms`);
    const imageGenStart = Date.now();
    
    // Generate the NFT image
    const resp = createImageResponse(
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
        width: 800,
        height: 800,
        optimize: isPreview,
      }
    );
    
    // console.log(`[NFT Image] Image generation completed in ${Date.now() - imageGenStart}ms`);
    
    resp.headers.set(
      "Cache-Control",
      `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}`
    );
    
    console.log(`[NFT Image] Total processing time: ${Date.now() - startTime}ms`);
    return resp;
  } catch (error) {
    console.error(`[NFT Image] Error generating game NFT image after ${Date.now() - startTime}ms:`, error);
    return new NextResponse("Error generating image", { status: 500 });
  }
}
