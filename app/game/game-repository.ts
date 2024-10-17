import { FramedlProPassOwnership } from "../pro/pass-ownership";
import { db } from "./../db/db";
import { v4 as uuidv4 } from "uuid";
import answers from "../words/answer-words";

export interface UserData {
  displayName?: string | null | undefined;
  username?: string | null | undefined;
  bio?: string | null | undefined;
  profileImage?: string | null | undefined;
  passOwnership?: FramedlProPassOwnership | null | undefined;
}

export type GameIdentityProvider = "xmtp" | "fc";

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
  saveStats(stats: UserStatsSave): Promise<UserStats>;
  loadStatsByUserKey(userKey: UserKey): Promise<UserStats | null>;
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

  async saveStats(stats: UserStatsSave): Promise<UserStats> {
    try {
      const key = `stats/${stats.identityProvider}/user_id/${stats.userId}`;
      const newStats = {
        ...stats,
        id: stats.id || uuidv4(),
      } as UserStats;
      await db.set<UserStats>(key, newStats);
      return newStats;
    } catch (e) {
      console.error("Error saving stats", stats, e);
      return Promise.reject(e);
    }
  }

  async loadStatsByUserKey(userKey: UserKey): Promise<UserStats | null> {
    try {
      const key = `stats/${userKey.identityProvider}/user_id/${userKey.userId}`;
      return await db.get<UserStats>(key);
    } catch (e) {
      console.error("Error loading stats by user key", userKey, e);
      return null;
    }
  }
}
