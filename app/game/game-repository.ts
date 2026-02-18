import { db } from "./../db/db";
import { UserDataColumn } from "../db/pg/types";
import answers from "../words/answer-words";

export interface UserData extends Partial<UserDataColumn> {
}

export type GameIdentityProvider = "xmtp" | "fc" | "lens" | "anon" | "fc_unauth";

export interface UserKey {
  userId: string;
  identityProvider: GameIdentityProvider;
}

export interface UserGameKey extends UserKey {
  gameKey: string;
  isDaily: boolean;
}

export interface Game extends UserGameKey {
  id: string;
  word: string;
  guesses: string[];
  userData?: UserData;
  createdAt: string;
}

export interface GameResult {
  won: boolean;
  frozen?: boolean;
  guessCount: number;
  date: string;
}

export interface UserStats extends UserKey {
  id: string;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  maxStreak: number;
  currentStreak: number;
  lastGameWonDate?: string;
  winGuessCounts: Record<number, number>;
  last30: GameResult[];
  userData?: UserData | null;
}

export interface UserStatsSave extends Omit<UserStats, "id"> {
  id?: string;
}

export interface GameSave extends Omit<Game, "id"> {
  id?: string;
}

export interface GameRepository {
  loadAll(): Promise<Game[]>;
}

interface GameClassic {
  fid: number;
  date: string;
  guesses: string[];
  id: string;
  userData?: UserData;
}

const startingDate = new Date("2024-02-03");
const getWordForGameClassic = (game: GameClassic) => {
  const date = new Date(game.date);
  const days = Math.floor((date.getTime() - startingDate.getTime()) / 86400000);
  return answers[days % answers.length]!;
};

export class GameRepositoryImpl implements GameRepository {
  async loadAll(): Promise<Game[]> {
    if (process.env.FRAMEDL_CLASSIC) {
      return (await db.getAll<GameClassic>("games/fid/*")).map((game) => {
        return {
          id: game.id,
          userId: game.fid.toString(),
          identityProvider: "fc",
          gameKey: game.date,
          isDaily: true,
          guesses: game.guesses,
          userData: game.userData,
          word: getWordForGameClassic(game),
          createdAt: new Date(game.date).toISOString(),
        };
      });
    }
    return await db.getAll<Game>("games/*/user_id/*");
  }
}
