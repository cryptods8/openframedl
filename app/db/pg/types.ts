import {
  ColumnType,
  Generated,
  Insertable,
  JSONColumnType,
  Selectable,
  Updateable,
} from "kysely";
import { FramedlProPassOwnership } from "../../pro/pass-ownership";
import { GameIdentityProvider } from "@/app/game/game-repository";

export interface Database {
  game: GameTable;
  vGame: VGameTable;
  customGame: CustomGameTable;
  vCustomGame: VCustomGameTable;
  reminder: ReminderTable;
  championshipSignup: ChampionshipSignupTable;
  arena: ArenaTable;
}

interface UserKey {
  userId: string;
  identityProvider: "xmtp" | "fc";
}

export interface UserDataColumn {
  displayName: string | null | undefined;
  username: string | null | undefined;
  profileImage: string | null | undefined;
  bio: string | null | undefined;
  passOwnership: FramedlProPassOwnership | null | undefined;
}

type UserDataColumnType = JSONColumnType<UserDataColumn>;

export type GameStatus = "WON" | "LOST" | "IN_PROGRESS";

export interface GameTable extends UserKey {
  id: string;

  gameKey: string;
  isDaily: boolean;
  word: string;
  guesses: JSONColumnType<string[]>;

  createdAt: ColumnType<Date, Date, never>;
  updatedAt: Date;
  completedAt: Date | null;

  status: GameStatus;
  guessCount: number;
  isHardMode: boolean;

  userData: UserDataColumnType | null;
  srcGameId: string | null;

  arenaId: number | null;
  arenaWordIndex: number | null;
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

  log: JSONColumnType<
    [
      {
        enabled: boolean;
        timestamp: number;
      }
    ]
  >;
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

interface DatedTable {
  createdAt: ColumnType<Date, Date, never>;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface AuthoredTable extends DatedTable, UserKey {
  userData: UserDataColumnType | null;
}

export interface ChampionshipSignupTable extends AuthoredTable {
  id: Generated<number>;
  roundNumber: number;

  srcId: number | null;
  hasTicket: boolean | null;
}

export type ArenaStart =
  | { type: "immediate" }
  | { type: "scheduled"; date: string };
export type ArenaDuration =
  | { type: "unlimited" }
  | { type: "interval"; minutes: number };
export type ArenaAudienceMember = {
  userId?: string;
  username?: string;
  identityProvider: GameIdentityProvider;
};
export interface ArenaMember extends UserKey {
  username?: string;
}

export type ArenaConfig = {
  start: ArenaStart;
  duration: ArenaDuration;
  audience: ArenaAudienceMember[];
  audienceSize: number;
  words: string[];
  suddenDeath: boolean | null | undefined;
  initWords: string[] | null | undefined;
};

export interface ArenaTable extends AuthoredTable {
  id: Generated<number>;

  config: JSONColumnType<ArenaConfig>;
  members: JSONColumnType<ArenaMember[]>;
  startedAt: Date | null;

  lastNotifiedAt: Date | null;
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

export type DBChampionshipSignup = Selectable<ChampionshipSignupTable>;
export type DBChampionshipSignupInsert = Insertable<ChampionshipSignupTable>;

export type DBArena = Selectable<ArenaTable>;
export type DBArenaInsert = Insertable<ArenaTable>;
export type DBArenaUpdate = Updateable<ArenaTable>;
