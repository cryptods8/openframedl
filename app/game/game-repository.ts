import { db } from "./../db/db";
import { v4 as uuidv4 } from "uuid";

export interface UserData {
  displayName?: string;
  username?: string;
  bio?: string;
  profileImage?: string;
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
  userData?: UserData;
}

export interface LeaderboardEntry extends UserKey {
  lastDate?: string;
  userData?: UserData;
  last14: GameResult[];
  totalGamesWon: number;
  totalGamesWonGuesses: number;
  score: number;
}

export interface Leaderboard {
  date: string;
  entries: LeaderboardEntry[];
  lastUpdatedAt: number;
}

export interface UserStatsSave extends Omit<UserStats, "id"> {
  id?: string;
}

export interface GameSave extends Omit<Game, "id"> {
  id?: string;
}

export interface GameRepository {
  save(game: GameSave): Promise<string>;
  loadByUserGameKey(key: UserGameKey): Promise<Game | null>;
  loadAllDailiesByUserKey(userKey: UserKey): Promise<Game[]>;
  loadById(id: string): Promise<Game | null>;
  saveStats(stats: UserStatsSave): Promise<UserStats>;
  loadStatsByUserKey(userKey: UserKey): Promise<UserStats | null>;
  loadAllStats(identityProvider: GameIdentityProvider): Promise<UserStats[]>;
  loadLeaderboard(
    identityProvider: GameIdentityProvider
  ): Promise<Leaderboard | null>;
  saveLeaderboard(
    identityProvider: GameIdentityProvider,
    leaderboard: Leaderboard
  ): Promise<Leaderboard>;
}

export class GameRepositoryImpl implements GameRepository {
  getKey(key: UserGameKey): string {
    return `games/${key.isDaily ? "d" : "r"}/${key.identityProvider}/user_id/${
      key.userId
    }/${key.gameKey}`;
  }

  getAllDailiesKey(userKey: UserKey): string {
    return `games/d/${userKey.identityProvider}/user_id/${userKey.userId}/*`;
  }

  async save(game: GameSave): Promise<string> {
    const key = this.getKey(game);
    const newGame: Game = { ...game, id: game.id || uuidv4() };
    await Promise.all([
      db.set<Game>(key, newGame),
      db.set<string>(`games/id/${newGame.id}`, key),
    ]);
    return newGame.id;
  }

  async loadByUserGameKey(userGameKey: UserGameKey): Promise<Game | null> {
    const key = this.getKey(userGameKey);
    return await db.get<Game>(key);
  }

  async loadAllDailiesByUserKey(userKey: UserKey): Promise<Game[]> {
    return await db.getAll<Game>(this.getAllDailiesKey(userKey));
  }

  async loadById(id: string): Promise<Game | null> {
    const key = await db.get<string>(`games/id/${id}`);
    if (!key) {
      return null;
    }
    return await db.get<Game>(key);
  }

  async saveStats(stats: UserStatsSave): Promise<UserStats> {
    const key = `stats/${stats.identityProvider}/user_id/${stats.userId}`;
    const newStats = {
      ...stats,
      id: stats.id || uuidv4(),
    } as UserStats;
    await db.set<UserStats>(key, newStats);
    return newStats;
  }

  async loadStatsByUserKey(userKey: UserKey): Promise<UserStats | null> {
    const key = `stats/${userKey.identityProvider}/user_id/${userKey.userId}`;
    return await db.get<UserStats>(key);
  }

  async loadAllStats(
    identityProvider: GameIdentityProvider
  ): Promise<UserStats[]> {
    return await db.getAll<UserStats>(`stats/${identityProvider}/user_id/*`);
  }

  async loadLeaderboard(
    identityProvider: GameIdentityProvider
  ): Promise<Leaderboard | null> {
    return await db.get<Leaderboard>(`leaderboard/${identityProvider}`);
  }

  async saveLeaderboard(
    identityProvider: GameIdentityProvider,
    leaderboard: Leaderboard
  ): Promise<Leaderboard> {
    const updatedLeaderboard = { ...leaderboard, lastUpdatedAt: Date.now() };
    await db.set<Leaderboard>(
      `leaderboard/${identityProvider}`,
      updatedLeaderboard
    );
    return updatedLeaderboard;
  }
}
