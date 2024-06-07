import {
  ColumnType,
  Generated,
  Insertable,
  JSONColumnType,
  Selectable,
  Updateable,
} from "kysely";
import { FramedlProPassOwnership } from "../../pro/pass-ownership";

export interface Database {
  game: GameTable;
  vGame: VGameTable;
  customGame: CustomGameTable;
  vCustomGame: VCustomGameTable;
  reminder: ReminderTable;
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
  srcGameId: string | null;
}

export interface CustomGameTable extends UserKey {
  id: string;

  createdAt: ColumnType<Date, Date, never>;

  word: string;

  userData: UserDataColumnType | null;

  isArt: boolean | null;
}

export interface ReminderTable extends UserKey {
  id: Generated<number>;

  createdAt: ColumnType<Date, Date, never>;
  updatedAt: Date;
  secret: string;

  enabledAt: Date | null;
  lastSentAt: Date | null;

  log: JSONColumnType<[{
    enabled: boolean;
    timestamp: number;
  }]>;
}

export interface VCustomGameTable extends CustomGameTable {
  numByUser: number;
}
export interface VGameTable extends GameTable {
  customNumByUser: number | null;
  customUserId: string | null;
  customIdentityProvider: "xmtp" | "fc" | null;
  customUserData: UserDataColumnType | null;
  customIsArt: boolean | null;
}

export type DBGame = Selectable<GameTable>;
export type DBGameInsert = Insertable<GameTable>;
export type DBGameUpdate = Updateable<GameTable>;
export type DBGameView = Selectable<VGameTable>;

export type DBCustomGame = Selectable<CustomGameTable>;
export type DBCustomGameInsert = Insertable<CustomGameTable>;
export type DBCustomGameView = Selectable<VCustomGameTable>;

export type DBReminder = Selectable<ReminderTable>;
export type DBReminderInsert = Insertable<ReminderTable>;
export type DBReminderUpdate = Updateable<ReminderTable>;
