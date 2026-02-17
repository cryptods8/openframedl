import { NextRequest, NextResponse } from "next/server";
import { createImageResponse } from "@/app/utils/image-response";
import { primaryColor } from "@/app/image-ui/image-utils";
import { GameBoard } from "@/app/image-ui/game-board";
import { BasicLayout } from "@/app/image-ui/basic-layout";
import {
  CustomGameMaker,
  gameService,
  GuessedGame,
} from "@/app/game/game-service";
import { GameTitle } from "@/app/image-ui/game-title";
import { externalBaseUrl } from "@/app/constants";
import { UserData, UserStats } from "@/app/game/game-repository";
import { UserStatsPanel } from "@/app/image-ui/game/user-stats-panel";
import { GameKeyboard } from "@/app/image-ui/game-keyboard";

export const dynamic = "force-dynamic";

function determineGameMessage(game?: GuessedGame) {
  if (!game) {
    return "Guess a 5-letter word!";
  }
  const who = game.userData?.username || "They";
  if (game.status === "WON") {
    const attempts = game.guesses.length;
    return `${who} won in ${attempts}${
      game.isHardMode ? "*" : ""
    } attempts! 🎉`;
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

function UserAvatar({ userData }: { userData: UserData | null }) {
  return (
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
        {userData?.profileImage ? (
          <img
            src={userData.profileImage}
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
            <div tw="text-6xl font-bold">{userData?.username?.[0] || "F"}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function customGameBoard(): GuessedGame {
  const wp = { character: "?", status: "WRONG_POSITION" } as const;
  const c = { character: "?", status: "CORRECT" } as const;
  const i = { character: "?", status: "INCORRECT" } as const;
  return {
    guesses: [
      { characters: [c, i, i, i, i] },
      { characters: [c, wp, c, i, i] },
      { characters: [c, wp, c, wp, i] },
      { characters: [c, c, c, c, c] },
    ],
    word: "?????",
    isHardModeRequired: false,
    isHardMode: false,
    originalGuesses: [],
    status: "WON",
    guessCount: 4,
    gameKey: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(),
    userId: "",
    userData: null,
    isDaily: false,
    isCustom: true,
    id: "",
    gameData: null,
    srcGameId: null,
    arenaId: null,
    arenaWordIndex: null,
    identityProvider: "fc",
    allGuessedCharacters: {},
  };
}

function ResultImage({
  game,
  stats,
  customMaker,
}: {
  game?: GuessedGame;
  stats?: UserStats | null;
  customMaker?: CustomGameMaker;
}) {
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
            {customMaker && !game ? (
              <GameBoard game={customGameBoard()} reveal="all" />
            ) : (
              <GameBoard game={game} reveal="none" />
            )}
          </div>
        </div>
        <div
          tw={"flex flex-col flex-1 px-8 pt-24 pb-20"}
          style={{
            gap: "3rem",
          }}
        >
          <div
            tw="flex flex-col flex-1 items-center justify-between"
            style={{ gap: "1rem" }}
          >
            <GameTitle
              game={game}
              customMaker={customMaker}
              type={
                customMaker ? (customMaker.isArt ? "ART" : "CUSTOM") : undefined
              }
              size="lg"
            />

            <div
              tw="flex flex-col items-center text-4xl flex-wrap text-center"
              style={{
                fontFamily: "Inter",
                fontWeight: 400,
                wordBreak: "break-word",
                color: game ? primaryColor() : primaryColor(0.54),
                gap: "1rem",
                lineHeight: 1.33,
              }}
            >
              {game || !customMaker ? (
                determineGameMessage(game)
              ) : customMaker.isArt ? (
                <div tw="flex flex-col items-center" style={{ gap: "1rem" }}>
                  <div>Draw with the word</div>
                  <div tw="flex flex-row" style={{ gap: "0.25rem" }}>
                    {customMaker.word?.split("").map((letter, idx) => (
                      <div
                        key={idx}
                        tw="h-12 w-12 flex items-center justify-center text-white text-3xl"
                        style={{
                          backgroundColor: "green",
                          fontWeight: 600,
                        }}
                      >
                        {letter.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                "Guess a 5-letter word!"
              )}
            </div>

            {customMaker?.userData != null && (
              <UserAvatar userData={customMaker.userData} />
            )}

            {stats && game && (
              <div tw="flex">
                <UserStatsPanel
                  stats={stats}
                  currentGuessCount={game.guessCount}
                  currentGameKey={game.gameKey}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </BasicLayout>
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gameId = searchParams.get("id") as string | undefined;
  const cwParam = searchParams.get("cw") as string | undefined;

  if (gameId) {
    const game = gameId ? await gameService.load(gameId) : null;
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const userStats = await gameService.loadStats(game);

    return createImageResponse(<ResultImage game={game} stats={userStats} />, {
      width: 1200,
      height: 800,
    });
  }
  if (cwParam) {
    const customMaker = await gameService.loadCustomGameMaker(cwParam);
    if (!customMaker) {
      return NextResponse.json(
        { error: "Custom game not found" },
        { status: 404 },
      );
    }
    return createImageResponse(<ResultImage customMaker={customMaker} />, {
      width: 1200,
      height: 800,
    });
  }

  return NextResponse.json(
    { error: "Missing game id or custom word" },
    { status: 400 },
  );
}
