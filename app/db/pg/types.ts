import {
  ColumnType,
  Insertable,
  JSONColumnType,
  Selectable,
  Updateable,
} from "kysely";
import { FramedlProPassOwnership } from "../../pro/pass-ownership";

export interface Database {
  game: GameTable;
  customGame: CustomGameTable;
}

interface UserKey {
  userId: string;
  identityProvider: "xmtp" | "fc";
}

type UserDataColumnType = JSONColumnType<{
  displayName: string | null | undefined;
  username: string | null | undefined;
  profileImage: string | null | undefined;
  bio: string | null | undefined;
  passOwnership: FramedlProPassOwnership | null | undefined;
}>;

export interface GameTable extends UserKey {
  id: string;

  gameKey: string;
  isDaily: boolean;
  word: string;
  guesses: JSONColumnType<string[]>;

  createdAt: ColumnType<Date, Date, never>;
  updatedAt: Date;
  completedAt: Date | null;

  status: "WON" | "LOST" | "IN_PROGRESS";
  guessCount: number;
  isHardMode: boolean;

  userData: UserDataColumnType | null;
}

export interface CustomGameTable extends UserKey {
  id: string;

  createdAt: ColumnType<Date, Date, never>;

  word: string;

  userData: UserDataColumnType | null;
}

export type DBGame = Selectable<GameTable>;
export type DBGameInsert = Insertable<GameTable>;
export type DBGameUpdate = Updateable<GameTable>;

export type DBCustomGame = Selectable<CustomGameTable>;
export type DBCustomGameInsert = Insertable<CustomGameTable>;
