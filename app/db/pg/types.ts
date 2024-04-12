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
}

export interface GameTable {
  id: string;

  userId: string;
  identityProvider: "xmtp" | "fc";
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

  userData: JSONColumnType<{
    displayName: string | null | undefined;
    username: string | null | undefined;
    profileImage: string | null | undefined;
    bio: string | null | undefined;
    passOwnership: FramedlProPassOwnership | null | undefined;
  }> | null;
}

export type DBGame = Selectable<GameTable>;
export type DBGameInsert = Insertable<GameTable>;
export type DBGameUpdate = Updateable<GameTable>;
