import { NextRequest, NextResponse } from "next/server";
import { createImageResponse } from "@/app/utils/image-response";
import { GameKeyboard } from "@/app/image-ui/game-keyboard";
import { primaryColor } from "@/app/image-ui/image-utils";
import { GameBoard } from "@/app/image-ui/game-board";
import { ArenaTitle } from "@/app/image-ui/arena/arena-title";
import { BasicLayout } from "@/app/image-ui/basic-layout";
import { gameService, GuessedGame } from "@/app/game/game-service";
import { verifyUrl } from "@/app/api/api-utils";

export const dynamic = "force-dynamic";

function determineGameMessage(game: GuessedGame) {
  if (game.status === "WON") {
    const attempts = game.guesses.length;
    let who = "You won";
    return `🎉 ${who} in ${attempts}${game.isHardMode ? "*" : ""} attempts!`;
  }
  if (game.status === "LOST") {
    return `The correct word was "${game.word.toUpperCase()}"`;
  }
  if (game.guesses.length === 0) {
    return "Start guessing...";
  }
  return (
    "Keep guessing..." + (game.isHardMode && game.guesses.length > 1 ? "*" : "")
  );
}

function ResultImage({
  game,
  message,
}: {
  game: GuessedGame;
  message?: string;
}) {
  return (
    <BasicLayout>
      <div tw="flex w-full h-full items-stretch justify-between">
        <div tw="flex">
          <GameBoard game={game} isPublic={false} />
        </div>
        <div
          tw={"flex flex-col flex-1 px-8 border-l"}
          style={{
            gap: "3rem",
            borderColor: primaryColor(0.2),
            backgroundColor: primaryColor(0.04),
          }}
        >
          <div
            tw="flex flex-col flex-1 items-center relative pt-12"
            style={{ gap: "1rem" }}
          >
            <ArenaTitle
              stickyPosition="none"
              subtitle={`Word #${game.arenaWordIndex! + 1} of ${
                game.arena?.config.words.length
              }`}
              subtitlePlacement="under"
            />

            <div
              tw="flex text-4xl flex-wrap pt-6"
              style={{
                fontFamily: "Inter",
                fontWeight: 400,
                wordBreak: "break-all",
                color: primaryColor(0.64),
              }}
            >
              {determineGameMessage(game)}
            </div>
            {message ? (
              <div
                tw="absolute flex items-center justify-center"
                style={{
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                <div
                  tw="flex items-center justify-center flex-wrap text-white py-4 px-8 rounded-md text-4xl shadow-lg"
                  style={{
                    backgroundColor: primaryColor(0.84),
                    wordBreak: "break-all",
                  }}
                >
                  {message}
                </div>
              </div>
            ) : null}
          </div>
          <div tw="flex flex-col items-center justify-center pb-12">
            <GameKeyboard game={game} customMaker={null} />
          </div>
        </div>
      </div>
    </BasicLayout>
  );
}

export async function GET(req: NextRequest) {
  verifyUrl(req, ["gid", "msg"]);

  const gameId = req.nextUrl.searchParams.get("gid") as string | undefined;
  const message = req.nextUrl.searchParams.get("msg") as string | undefined;

  const game = gameId ? await gameService.load(gameId) : null;
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return createImageResponse(<ResultImage game={game} message={message} />);
}
