import { NextRequest, NextResponse } from "next/server";
import { createImageResponse } from "@/app/utils/image-response";
import { GameKeyboard } from "@/app/image-ui/game-keyboard";
import { primaryColor } from "@/app/image-ui/image-utils";
import { GameBoard } from "@/app/image-ui/game-board";
import { ArenaTitle } from "@/app/image-ui/arena/arena-title";
import { BasicLayout } from "@/app/image-ui/basic-layout";
import { gameService, GuessedGame } from "@/app/game/game-service";
import { verifyUrl } from "@/app/api/api-utils";
import { GameTitle } from "@/app/image-ui/game-title";
import { externalBaseUrl } from "@/app/constants";

export const dynamic = "force-dynamic";

function determineGameMessage(game: GuessedGame) {
  const who = game.userData?.username || "They";
  if (game.status === "WON") {
    const attempts = game.guesses.length;
    return `${who} won in ${attempts}${game.isHardMode ? "*" : ""} attempts!`;
  }
  if (game.status === "LOST") {
    return `${who} lost, sadly…`;
  }
  if (game.guesses.length === 0) {
    return "Start guessing...";
  }
  return (
    "Keep guessing..." + (game.isHardMode && game.guesses.length > 1 ? "*" : "")
  );
}

function drawRandomRectangles(count: number) {
  return Array.from({ length: 5 }).map((_, idx) => {
    const r = Math.random();
    return (
      <div
        key={idx}
        className="w-12 h-12 absolute"
        style={{
          backgroundColor: r > 0.33 ? (r > 0.66 ? "green" : "orange") : "white",
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          // transform: `rotate(${Math.random() * 360}deg)`,
        }}
      />
    );
  });
}

function ResultImage({ game }: { game: GuessedGame }) {
  return (
    <BasicLayout>
      <div
        tw="flex w-full h-full items-stretch justify-between relative"
        style={{ backgroundColor: primaryColor(0.02) }}
      >
        <div tw="flex items-center justify-center pl-12">
          <div
            tw="flex items-center justify-center rounded-lg border bg-white p-4"
            style={{ borderColor: primaryColor(0.24) }}
          >
            <GameBoard game={game} isPublic />
          </div>
        </div>
        <div
          tw={"flex flex-col flex-1 px-8 py-32"}
          style={{
            gap: "3rem",
          }}
        >
          <div tw="flex flex-col flex-1 items-center" style={{ gap: "1rem" }}>
            <GameTitle game={game} customMaker={null} size="lg" />

            <div
              tw="flex flex-col items-center text-4xl flex-wrap pt-16 text-center"
              style={{
                fontFamily: "Inter",
                fontWeight: 400,
                wordBreak: "break-word",
                color: primaryColor(),
                gap: "1rem",
                lineHeight: 1.33,
              }}
            >
              {game.completedAt != null && (
                <div
                  tw="flex relative"
                  style={{
                    color: primaryColor(),
                  }}
                >
                  <div tw="flex">
                    <img
                      tw="w-52 h-52"
                      src={`${externalBaseUrl}/pfp-bg.png`}
                      style={{
                        objectFit: "cover",
                        borderColor: primaryColor(),
                      }}
                    />
                  </div>
                  <div tw="absolute top-10 left-10 flex">
                    {game.userData?.profileImage ? (
                      <img
                        src={game.userData.profileImage}
                        tw="w-32 h-32 rounded-full bg-white border-4 border-white"
                        style={{
                          objectFit: "cover",
                          // borderColor: primaryColor(),
                        }}
                      />
                    ) : (
                      <div
                        tw="w-32 h-32 rounded-full bg-white border-4 border-white flex items-center justify-center"
                        // style={{ borderColor: primaryColor() }}
                      >
                        <div tw="text-6xl font-bold">
                          {game.userData?.username?.[0] || "F"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center text-center">
                {determineGameMessage(game)}
              </div>
            </div>
          </div>
          {/* <div tw="flex flex-col items-center justify-center pb-12">
            <GameKeyboard game={null} customMaker={null} />
          </div> */}
        </div>
      </div>
    </BasicLayout>
  );
}

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("id") as string | undefined;

  const game = gameId ? await gameService.load(gameId) : null;
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return createImageResponse(<ResultImage game={game} />, {
    width: 1200,
    height: 800,
  });
}
