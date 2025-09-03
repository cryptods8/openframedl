import { getUserInfoFromRequest } from "@/app/api/api-utils";
import {
  findArenaWithGamesById,
  updateArena,
} from "@/app/game/arena-pg-repository";
import { UserData, UserGameKey, UserKey } from "@/app/game/game-repository";
import {
  GameMetadata,
  gameService,
  GuessedGame,
  PreCreateFunction,
} from "@/app/game/game-service";
import {
  checkSuddenDeath,
  getArenaAvailabilityProperties,
  getArenaGamesForUser,
  toPublicArena,
} from "@/app/games/arena/arena-utils";
import { nextGameState } from "@/app/games/game-state";
import { loadUserData, loadUsername } from "@/app/games/user-data";
import { NextRequest, NextResponse } from "next/server";

function error(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

interface PlayRequest {
  guess?: string;
  // gameId?: string;
  gameKey?: string;
}

async function hasNextGame(game: GuessedGame): Promise<boolean> {
  const { arena } = game;
  if (!arena) {
    return false;
  }
  const { config } = arena;
  if (config.suddenDeath && config.audienceSize === 2) {
    // check whether the opponent has better score
    const arenaWithGames = (await findArenaWithGamesById(arena.id))!;
    const suddenDeathStatus = checkSuddenDeath(arenaWithGames);
    if (suddenDeathStatus?.isOver) {
      return false;
    }
  }
  return config.words.length > game.arenaWordIndex! + 1;
}

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ arenaId: string }>;
  }
) {
  const { userKey } = await getUserInfoFromRequest(req, {});
  const { arenaId } = await params;
  const playRequest: PlayRequest = await req.json();

  if (!arenaId) {
    return error("Arena ID not found!");
  }
  const numArenaId = parseInt(arenaId, 10);
  if (isNaN(numArenaId)) {
    return error("Invalid arena ID");
  }
  if (!userKey) {
    return error("User ID not found!");
  }

  let gameKey: string;
  let preCreateLoader: PreCreateFunction | undefined;
  let userData: UserData | undefined;
  if (playRequest.gameKey) {
    gameKey = playRequest.gameKey;
  } else {
    const [arena, loadedUserData] = await Promise.all([
      findArenaWithGamesById(numArenaId),
      loadUserData(userKey),
    ]);
    userData = loadedUserData;

    if (!arena) {
      return error("Arena not found");
    }

    const { membership, status, completionStatus } =
      getArenaAvailabilityProperties(arena, userKey);
    if (membership?.type !== "member" && membership?.type !== "member_free_slot") {
      return error("You are not a member of the arena");
    }
    if (status !== "OPEN") {
      return error("Arena is not open for playing");
    }

    const games = getArenaGamesForUser(arena, userKey);
    const lastGame = games[games.length - 1];

    if (lastGame && lastGame.status === "IN_PROGRESS") {
      gameKey = lastGame.gameKey;
    } else if (
      games.length < arena.config.words.length &&
      completionStatus !== "COMPLETED"
    ) {
      gameKey = `arena_${arenaId}_${games.length + 1}`;
      preCreateLoader = async () => {
        const arenaWordIndex = games.length;
        return {
          word: arena.config.randomWords
            ? gameService.generateRandomWords(1)[0]!
            : arena.config.words[arenaWordIndex]!,
          arena: arena,
          arenaWordIndex,
          initWords: arena.config.initWords || undefined,
        };
      };
    } else {
      // TODO return special screen -- everything is finished
      gameKey = lastGame!.gameKey;
    }
  }
  const userGameKey: UserGameKey = {
    ...userKey,
    gameKey,
    isDaily: false,
  };

  const gameState = await nextGameState(userGameKey, playRequest.guess, {
    // srcGameId: searchParams.src,
    userData,
    preCreate: preCreateLoader,
  });
  const { finished, game, message, validationResult } = gameState;
  if (playRequest.guess && validationResult != null && validationResult !== "VALID") {
    console.log("Invalid guess", playRequest.guess, validationResult);
    return NextResponse.json(
      { error: message, validationResult },
      { status: 400 }
    );
  }

  const { arena } = game;
  const hasNext = await hasNextGame(game);
  return NextResponse.json({
    data: {
      ...game,
      arena: arena ? toPublicArena(arena) : undefined,
      word: game.completedAt != null ? game.word : "",
      metadata: {
        hasNext,
        finished,
      },
    },
  });
}
