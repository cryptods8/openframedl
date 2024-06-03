import seedrandom from "seedrandom";
import {
  GameRepository,
  GameRepositoryImpl,
  UserData,
  UserStats,
  UserStatsSave,
  GameResult,
  UserGameKey,
  UserKey,
  GameIdentityProvider,
} from "./game-repository";
import * as gameRepo from "./game-pg-repository";
import * as customGameRepo from "./custom-game-pg-repository";
import { Leaderboard, LeaderboardDataItem } from "./game-pg-repository";
import answers from "../words/answer-words";
import allWords from "../words/all-words";
import { isPro } from "../constants";
import {
  DBCustomGameView,
  DBGame,
  DBGameInsert,
  DBGameUpdate,
  DBGameView,
} from "../db/pg/types";
import { v4 as uuidv4 } from "uuid";
import { addDaysToDate, getDailyGameKey } from "./game-utils";
import { DEFAULT_LEADERBOARD_DAYS } from "./game-constants";

const startingDate = new Date("2024-02-03");

const seedSalt = process.env.SEED_SALT;
if (!seedSalt) {
  throw new Error("SEED_SALT must be set");
}
const shuffleSecret = process.env.SHUFFLE_SECRET;
if (!shuffleSecret) {
  throw new Error("SHUFFLE_SECRET must be set");
}

function shuffleArray<T>(array: T[], seed: string): T[] {
  let rng = seedrandom(seed);
  let currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(rng() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex]!;
    array[currentIndex] = array[randomIndex]!;
    array[randomIndex] = temporaryValue;
  }

  return array;
}

const getWordForIndex = (index: number, seed: string): string => {
  const shuffledAnswers = shuffleArray([...answers], seed);
  return shuffledAnswers[index % shuffledAnswers.length]!;
};

const getWordForDateString = (dateString: string, seed: string): string => {
  const date = new Date(dateString);
  const days = Math.floor(
    (date.getTime() - startingDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return getWordForIndex(days, seed);
};

const CUSTOM_WORD_KEY_PREFIX = "custom_";

interface GameWord {
  word: string;
  customGame?: DBCustomGameView;
}

export const getWordForUserGameKey = async (
  userGameKey: UserGameKey
): Promise<GameWord> => {
  const seed =
    userGameKey.identityProvider +
    "/" +
    shuffleSecret +
    (isPro ? `/pro/${userGameKey.userId}` : "");
  if (userGameKey.isDaily) {
    return { word: getWordForDateString(userGameKey.gameKey, seed) };
  }

  if (userGameKey.gameKey.startsWith(CUSTOM_WORD_KEY_PREFIX)) {
    const customGameId = userGameKey.gameKey.substring(
      CUSTOM_WORD_KEY_PREFIX.length
    );
    const customGame = await customGameRepo.findById(customGameId);
    if (customGame) {
      return { word: customGame.word, customGame };
    } else {
      console.warn(
        "Invalid custom game id, falling back to random word",
        customGameId
      );
    }
  }

  const rng = seedrandom(seedSalt + "/" + userGameKey.gameKey);
  return { word: getWordForIndex(Math.floor(rng() * answers.length), seed) };
};

export interface GuessCharacter {
  character: string;
  status: "CORRECT" | "WRONG_POSITION" | "INCORRECT";
}

export interface Guess {
  characters: GuessCharacter[];
}

export interface CustomGameMaker extends UserKey {
  number: number;
  isArt: boolean;
  userData?: UserData;
  word?: string;
}

export interface GuessedGame extends Omit<DBGame, "guesses"> {
  originalGuesses: string[];
  guesses: Guess[];
  allGuessedCharacters: Record<string, GuessCharacter>;
  status: "IN_PROGRESS" | "WON" | "LOST";
  word: string;
  isHardMode: boolean;
  isCustom: boolean;
  customMaker?: CustomGameMaker;
}

export interface PublicGuessedGame {
  id: string;
  userId: string;
  identityProvider: GameIdentityProvider;
  gameKey: string;
  guesses: Guess[];
  status: "IN_PROGRESS" | "WON" | "LOST";
  isHardMode: boolean;
  isCustom: boolean;
  isDaily: boolean;
  userData?: UserData | null;
  customMaker?: CustomGameMaker;
  completedAt?: Date | null;
  createdAt: Date;
  word?: string;
}

export type GuessValidationStatus =
  | "VALID"
  | "INVALID_EMPTY"
  | "INVALID_SIZE"
  | "INVALID_FORMAT"
  | "INVALID_WORD";

export interface LoadOrCreateOptions {
  userData?: UserData;
  srcGameId?: string;
}

type BaseLoadLeaderboardOptions = {
  userId?: string;
};

export type LoadTopNLeaderboardOptions = BaseLoadLeaderboardOptions & {
  type: "TOP_N";
  n: number;
};
export type LoadDateRangeLeaderboardOptions = BaseLoadLeaderboardOptions & {
  type: "DATE_RANGE";
  date?: string;
  days?: number;
};

export type LoadLeaderboardOptions =
  | LoadTopNLeaderboardOptions
  | LoadDateRangeLeaderboardOptions;

export interface GameService {
  loadOrCreate(
    userGameKey: UserGameKey,
    options?: LoadOrCreateOptions
  ): Promise<GuessedGame>;
  load(id: string): Promise<GuessedGame | null>;
  loadAllDailiesByUserKey(userKey: UserKey): Promise<GuessedGame[]>;
  loadPublic(id: string, personal: boolean): Promise<PublicGuessedGame | null>;
  loadPublicByUserGameKey(
    userGameKey: UserGameKey
  ): Promise<PublicGuessedGame | null>;
  loadAllPublic(filter: gameRepo.GameFilter): Promise<PublicGuessedGame[]>;
  guess(game: GuessedGame, guess: string): Promise<GuessedGame>;
  undoGuess(game: GuessedGame): Promise<GuessedGame>;
  reset(game: GuessedGame): Promise<GuessedGame>;
  validateGuess(
    game: GuessedGame,
    guess: string | null | undefined
  ): GuessValidationStatus;
  loadStats(userKey: UserKey): Promise<UserStats | null>;
  loadLeaderboard(
    identityProvider: GameIdentityProvider,
    options: LoadLeaderboardOptions
  ): Promise<PersonalLeaderboard>;
  loadReplacedScore(game: GuessedGame): Promise<number | null>;
  loadCustomGameMaker(customId: string): Promise<CustomGameMaker | null>;
  loadUserData(userKey: UserKey): Promise<UserData | null>;
  getDailyKey(): string;
  migrateToPg(): Promise<DBGameInsert[]>;
}

export interface PersonalLeaderboard extends Leaderboard {
  personalEntry?: LeaderboardDataItem;
  personalEntryIndex?: number;
}

const GUESS_PATTERN = /^[A-Za-z]{5}$/;

interface WordCharacter {
  count: number;
  positions: Record<number, boolean>;
}

const MAX_GUESSES = 6;

export class GameServiceImpl implements GameService {
  private readonly gameRepository: GameRepository = new GameRepositoryImpl();

  getDailyKey() {
    return getDailyGameKey(new Date());
  }

  private toGuessCharacters(
    wordCharacters: Record<string, WordCharacter>,
    guess: string
  ): GuessCharacter[] {
    const characters: GuessCharacter[] = [];
    const charMap: Record<number, GuessCharacter> = {};
    const charCounts: Record<string, number> = {};
    // find correct first
    for (let i = 0; i < guess.length; i++) {
      const c = guess[i]!;
      const cc = wordCharacters[c];
      if (cc && cc.positions[i]) {
        charMap[i] = { character: c, status: "CORRECT" };
        charCounts[c] = (charCounts[c] || 0) + 1;
      }
    }
    // find the other positions
    for (let i = 0; i < guess.length; i++) {
      const c = guess[i]!;
      const cc = wordCharacters[c];
      if (cc) {
        if (!cc.positions[i]) {
          charCounts[c] = (charCounts[c] || 0) + 1;
          charMap[i] = {
            character: c,
            status: charCounts[c]! > cc.count ? "INCORRECT" : "WRONG_POSITION",
          };
        }
      } else {
        charMap[i] = { character: c, status: "INCORRECT" };
      }
    }
    for (let i = 0; i < guess.length; i++) {
      const c = charMap[i];
      if (c) {
        characters.push(c);
      } else {
        console.error("No character found for index", i, guess);
        characters.push({ character: guess[i]!, status: "INCORRECT" });
      }
    }
    return characters;
  }

  private isHardMode(
    prevGuess: GuessCharacter[],
    characters: GuessCharacter[]
  ) {
    for (let i = 0; i < prevGuess.length; i++) {
      const hint = prevGuess[i]!;
      if (hint.status === "CORRECT") {
        // check the position matches
        const currentChar = characters[i];
        if (!currentChar || currentChar.character !== hint.character) {
          return false;
        }
      } else if (hint.status === "WRONG_POSITION") {
        // check the character is in the guess
        const currentChar = characters.find(
          (c) => c.character === hint.character
        );
        if (!currentChar) {
          return false;
        }
      }
    }
    // check that all prevGuess characters are in the current guess with at least the same multiplicities
    const toMultiplicityMap = (chars: GuessCharacter[]) =>
      chars.reduce((acc, c) => {
        if (c.status === "CORRECT" || c.status === "WRONG_POSITION") {
          acc[c.character] = (acc[c.character] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
    const prevCharMap = toMultiplicityMap(prevGuess);
    const currentCharMap = toMultiplicityMap(characters);
    for (const key in prevCharMap) {
      const prevCount = prevCharMap[key] || 0;
      const currentCount = currentCharMap[key] || 0;
      if (prevCount > currentCount) {
        return false;
      }
    }
    return true;
  }

  private isDBGameView(game: DBGame | DBGameView): game is DBGameView {
    return (game as DBGameView).customUserId !== undefined;
  }

  private toGuessedGame(game: DBGame | DBGameView): GuessedGame {
    const word = game.word;
    const wordCharacters = word.split("").reduce((acc, c, idx) => {
      if (!acc[c]) {
        acc[c] = { count: 0, positions: {} };
      }
      acc[c]!.count++;
      acc[c]!.positions[idx] = true;
      return acc;
    }, {} as Record<string, WordCharacter>);
    // guessed - correct, wrong position, incorrect
    const allGuessedCharacters: Record<string, GuessCharacter> = {};
    const guesses: Guess[] = [];
    let isHardMode = true;
    let prevGuess: GuessCharacter[] | undefined;
    for (const guess of game.guesses) {
      const characters = this.toGuessCharacters(wordCharacters, guess);
      if (isHardMode) {
        if (prevGuess) {
          isHardMode = this.isHardMode(prevGuess, characters);
        }
        prevGuess = characters;
      }
      for (let i = 0; i < characters.length; i++) {
        const gc = characters[i]!;
        const prevGuessedCharacter = allGuessedCharacters[gc.character];
        if (
          !prevGuessedCharacter ||
          prevGuessedCharacter.status === "INCORRECT" ||
          gc.status === "CORRECT"
        ) {
          allGuessedCharacters[gc.character] = gc;
        }
      }
      guesses.push({ characters });
    }

    const lastGuess = guesses[guesses.length - 1];
    const won =
      lastGuess &&
      lastGuess.characters.reduce(
        (acc, c) => acc && c.status === "CORRECT",
        true
      );
    const status = won
      ? "WON"
      : game.guesses.length >= MAX_GUESSES
      ? "LOST"
      : "IN_PROGRESS";

    let customMaker: CustomGameMaker | undefined;
    if (this.isDBGameView(game)) {
      customMaker = game.customUserId
        ? {
            userId: game.customUserId,
            identityProvider: game.customIdentityProvider!,
            number: game.customNumByUser || 1,
            userData: game.customUserData || undefined,
            isArt: game.customIsArt || false,
            word: game.customIsArt ? game.word : undefined,
          }
        : undefined;
    }
    return {
      ...game,
      originalGuesses: game.guesses,
      guesses,
      allGuessedCharacters,
      status,
      word,
      isHardMode,
      isCustom: game.gameKey.startsWith(CUSTOM_WORD_KEY_PREFIX),
      customMaker,
    };
  }

  private toCustomGameMaker(customGame: DBCustomGameView): CustomGameMaker {
    return {
      userId: customGame.userId,
      identityProvider: customGame.identityProvider,
      number: customGame.numByUser || 1,
      userData: customGame.userData || undefined,
      isArt: customGame.isArt || false,
      word: customGame.isArt ? customGame.word : undefined,
    };
  }

  async loadCustomGameMaker(customId: string): Promise<CustomGameMaker | null> {
    const customGame = await customGameRepo.findById(customId);
    if (!customGame) {
      return null;
    }
    return this.toCustomGameMaker(customGame);
  }

  async loadOrCreate(
    key: UserGameKey,
    options?: LoadOrCreateOptions
  ): Promise<GuessedGame> {
    const game = await gameRepo.findByUserGameKey(key);
    if (!game) {
      const { word, customGame } = await getWordForUserGameKey(key);
      const { userData, srcGameId } = options || {};
      let customMaker: CustomGameMaker | undefined;
      if (customGame) {
        customMaker = this.toCustomGameMaker(customGame);
      }
      const newGame = {
        ...key,
        srcGameId: srcGameId || null,
        id: uuidv4(),
        guesses: JSON.stringify([]),
        userData: userData ? JSON.stringify(userData) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        word,
        status: "IN_PROGRESS" as const,
        guessCount: 0,
        isHardMode: true,
      };
      console.debug("creating game", newGame);
      const createdGame = await gameRepo.insert(newGame);
      return {
        ...createdGame,
        guesses: [],
        originalGuesses: [],
        allGuessedCharacters: {},
        isCustom: key.gameKey.startsWith(CUSTOM_WORD_KEY_PREFIX),
        customMaker,
      };
    }
    return this.toGuessedGame(game);
  }

  async load(id: string): Promise<GuessedGame | null> {
    const game = await gameRepo.findById(id);
    if (!game) {
      return null;
    }
    return this.toGuessedGame(game);
  }

  private toPublicGuessedGame(game: GuessedGame): PublicGuessedGame {
    return {
      id: game.id,
      userId: game.userId,
      identityProvider: game.identityProvider,
      gameKey: game.gameKey,
      isHardMode: game.isHardMode,
      isCustom: game.isCustom,
      isDaily: game.isDaily,
      customMaker: game.customMaker,
      createdAt: game.createdAt,
      completedAt: game.completedAt,
      userData: game.userData,
      guesses: game.guesses.map((g) => {
        return {
          characters: g.characters.map((c) => {
            return { status: c.status, character: "" };
          }),
        };
      }),
      status: game.status,
    };
  }

  async loadPublic(
    id: string,
    personal: boolean
  ): Promise<PublicGuessedGame | null> {
    const game = await gameRepo.findById(id);
    if (!game) {
      return null;
    }
    const guessedGame = this.toGuessedGame(game);
    if (personal) {
      if (guessedGame.isCustom) {
        return {
          ...guessedGame,
          word: undefined,
        };
      }
      return guessedGame;
    }
    return this.toPublicGuessedGame(guessedGame);
  }

  async loadPublicByUserGameKey(
    userGameKey: UserGameKey
  ): Promise<PublicGuessedGame | null> {
    const game = await gameRepo.findByUserGameKey(userGameKey);
    if (!game) {
      return null;
    }
    const guessedGame = this.toGuessedGame(game);
    return this.toPublicGuessedGame(guessedGame);
  }

  async loadAllPublic(
    filter: gameRepo.GameFilter
  ): Promise<PublicGuessedGame[]> {
    const games = await gameRepo.findAllByFilter(filter);
    return games.map((g) => this.toPublicGuessedGame(this.toGuessedGame(g)));
  }

  private async loadOrCreateStats(game: GuessedGame): Promise<UserStatsSave> {
    const stats = await this.gameRepository.loadStatsByUserKey(game);
    if (stats) {
      return stats;
    }
    const allGames = await gameRepo.findAllDailyByUserKey(game);
    const prevGames = allGames
      .map((g) => this.toGuessedGame(g))
      .filter(
        (g) =>
          (g.status === "LOST" || g.status === "WON") &&
          g.gameKey < game.gameKey
      )
      .sort((a, b) => a.gameKey.localeCompare(b.gameKey));
    const emptyStats: UserStatsSave = {
      userId: game.userId,
      identityProvider: game.identityProvider,
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      maxStreak: 0,
      currentStreak: 0,
      winGuessCounts: {},
      last30: [],
    };
    return prevGames.reduce((acc, g) => this.updateStats(acc, g), emptyStats);
  }

  async loadAllDailiesByUserKey(userKey: UserKey): Promise<GuessedGame[]> {
    const games = await gameRepo.findAllDailyByUserKey(userKey);
    return games.map((g) => this.toGuessedGame(g));
  }

  private isPrevGameDate(currentDate: string, prevDate: string): boolean {
    const prev = new Date(prevDate);
    const next = addDaysToDate(prev, 1);
    return getDailyGameKey(next) === currentDate;
  }

  private updateStats(
    stats: UserStatsSave,
    guessedGame: GuessedGame
  ): UserStatsSave {
    const newStats = { ...stats };
    newStats.userData = guessedGame.userData;
    if (guessedGame.status === "WON") {
      newStats.totalWins++;
      const guessCount = guessedGame.guesses.length;
      newStats.winGuessCounts[guessCount] =
        (newStats.winGuessCounts[guessCount] || 0) + 1;
      if (
        stats.lastGameWonDate &&
        this.isPrevGameDate(guessedGame.gameKey, stats.lastGameWonDate)
      ) {
        newStats.currentStreak++;
      } else {
        newStats.currentStreak = 1;
      }
      newStats.lastGameWonDate = guessedGame.gameKey;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
    } else if (guessedGame.status === "LOST") {
      newStats.totalLosses++;
      newStats.currentStreak = 0;
    }
    newStats.totalGames++;
    newStats.last30.push({
      won: guessedGame.status === "WON",
      guessCount: guessedGame.guesses.length,
      date: guessedGame.gameKey,
    });
    if (newStats.last30.length > 30) {
      newStats.last30.shift();
    }
    return newStats;
  }

  async guess(guessedGame: GuessedGame, guess: string): Promise<GuessedGame> {
    if (!this.isValidGuess(guessedGame, guess)) {
      throw new Error("Guess is invalid!");
    }
    const game = await gameRepo.findByUserGameKey(guessedGame);
    if (!game) {
      throw new Error(`Game not found: ${guessedGame.id}`);
    }
    if (game.completedAt != null) {
      throw new Error(`Game already completed: ${guessedGame.id}`);
    }
    const formattedGuess = guess.trim().toLowerCase();
    game.guesses.push(formattedGuess);
    const resultGame = this.toGuessedGame(game);
    const isGameFinished =
      resultGame.status === "LOST" || resultGame.status === "WON";
    const now = new Date();
    await gameRepo.update(game.id, {
      isHardMode: resultGame.isHardMode,
      guesses: JSON.stringify(game.guesses),
      guessCount: game.guesses.length,
      userData: game.userData ? JSON.stringify(game.userData) : null,
      updatedAt: now,
      completedAt: isGameFinished ? now : null,
      status: resultGame.status,
    });
    const updatedGame = {
      ...resultGame,
      guessCount: game.guesses.length,
      updatedAt: now,
      completedAt: isGameFinished ? now : null,
    };
    if (isGameFinished && game.isDaily) {
      // update stats
      const stats = await this.loadOrCreateStats(guessedGame);
      const newStats = this.updateStats(stats, updatedGame);
      this.gameRepository.saveStats(newStats);
    }
    return updatedGame;
  }

  private fromGuessedGame(game: GuessedGame): DBGameView {
    const { customMaker } = game;
    return {
      id: game.id,
      userId: game.userId,
      identityProvider: game.identityProvider,
      gameKey: game.gameKey,
      isDaily: game.isDaily,
      word: game.word,
      guesses: game.originalGuesses,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      completedAt: game.completedAt,
      status: game.status,
      guessCount: game.guessCount,
      isHardMode: game.isHardMode,
      userData: game.userData ? game.userData : null,
      srcGameId: game.srcGameId || null,
      customUserId: customMaker?.userId || null,
      customIdentityProvider: customMaker?.identityProvider || null,
      customNumByUser: customMaker?.number || null,
      customUserData: customMaker?.userData
        ? {
            bio: customMaker.userData.bio,
            displayName: customMaker.userData.displayName,
            passOwnership: customMaker.userData.passOwnership,
            profileImage: customMaker.userData.profileImage,
            username: customMaker.userData.username,
          }
        : null,
      customIsArt: game.customMaker?.isArt || null,
    };
  }

  async undoGuess(guessedGame: GuessedGame): Promise<GuessedGame> {
    if (!guessedGame.customMaker?.isArt) {
      console.warn(
        "Request to undo non-custom game. Skipping...",
        guessedGame.id
      );
      return guessedGame;
    }
    if (guessedGame.guesses.length === 0) {
      console.warn("Request to undo game with no guesses. Skipping...");
      return guessedGame;
    }
    const updatedAt = new Date();
    const newGuesses = guessedGame.originalGuesses.slice(0, -1);
    const newGuessedGame = this.toGuessedGame({
      ...this.fromGuessedGame(guessedGame),
      guesses: newGuesses,
      guessCount: newGuesses.length,
    });
    const gameUpdates: DBGameUpdate = {
      isHardMode: newGuessedGame.isHardMode,
      guesses: JSON.stringify(newGuessedGame.originalGuesses),
      guessCount: newGuessedGame.guessCount,
      updatedAt,
      completedAt: null,
      status: "IN_PROGRESS",
    };
    await gameRepo.update(guessedGame.id, gameUpdates);
    return newGuessedGame;
  }

  async reset(guessedGame: GuessedGame): Promise<GuessedGame> {
    if (!guessedGame.customMaker?.isArt) {
      console.warn(
        "Request to reset non-custom game. Skipping...",
        guessedGame.id
      );
      return guessedGame;
    }
    const updatedAt = new Date();
    await gameRepo.update(guessedGame.id, {
      isHardMode: true,
      guesses: JSON.stringify([]),
      guessCount: 0,
      updatedAt,
      completedAt: null,
      status: "IN_PROGRESS",
    });
    return {
      ...guessedGame,
      completedAt: null,
      updatedAt,
      guesses: [],
      guessCount: 0,
      originalGuesses: [],
      allGuessedCharacters: {},
      status: "IN_PROGRESS",
      isHardMode: true,
    };
  }

  async loadStats(userKey: UserKey): Promise<UserStats | null> {
    return this.gameRepository.loadStatsByUserKey(userKey);
  }

  validateGuess(game: GuessedGame, guess: String | null | undefined) {
    if (!guess) {
      return "INVALID_EMPTY";
    }
    if (guess.length !== 5) {
      return "INVALID_SIZE";
    }
    const formattedGuess = guess.trim().toLowerCase();
    if (!GUESS_PATTERN.test(formattedGuess)) {
      return "INVALID_FORMAT";
    }
    if (!allWords.includes(formattedGuess) && formattedGuess !== game.word) {
      return "INVALID_WORD";
    }
    return "VALID";
  }

  private isValidGuess(game: GuessedGame, guess: string): boolean {
    return this.validateGuess(game, guess) === "VALID";
  }

  private async toLeaderboardEntry(
    stats: UserStats,
    lastDate: string
  ): Promise<LeaderboardDataItem> {
    const resultMap = stats.last30.reduce((acc, g) => {
      acc[g.date] = g;
      return acc;
    }, {} as Record<string, GameResult>);
    const toDate = resultMap[lastDate]
      ? new Date(lastDate)
      : addDaysToDate(new Date(lastDate), -1);
    const last14: GameResult[] = [];
    let lastPlayedDate: string | undefined = undefined;
    let wonCount = 0;
    let lostCount = 0;
    let unplayedCount = 0;
    let wonGuessCount = 0;
    let totalGuessCount = 0;
    for (let i = 13; i >= 0; i--) {
      const date = addDaysToDate(toDate, -i);
      const dateKey = getDailyGameKey(date);
      const result = resultMap[dateKey];
      if (result) {
        last14.push(result);
        if (result.won) {
          wonCount++;
          wonGuessCount += result.guessCount;
        } else {
          wonGuessCount += 8;
          lostCount++;
        }
        lastPlayedDate = dateKey;
      } else {
        totalGuessCount += 9;
        unplayedCount += 1;
      }
    }
    let userData = stats.userData;
    if (!userData && lastPlayedDate) {
      const lastGame = await gameRepo.findByUserGameKey({
        userId: stats.userId,
        identityProvider: stats.identityProvider,
        gameKey: lastPlayedDate,
        isDaily: true,
      });
      userData = lastGame?.userData;
    }
    return {
      userId: stats.userId,
      identityProvider: stats.identityProvider,
      wonCount,
      lostCount,
      unplayedCount,
      wonGuessCount,
      totalGuessCount,
      userData: userData || null,
    };
  }

  private async enrichLeaderboard(
    l: Leaderboard,
    userKey: UserKey,
    loadStatsByUserKey: (
      userKey: UserKey
    ) => Promise<UserStats | null | undefined>
  ): Promise<PersonalLeaderboard> {
    const personalEntryIndex = l.entries.findIndex(
      (e) =>
        e.userId === userKey.userId &&
        e.identityProvider === userKey.identityProvider
    );
    if (personalEntryIndex !== -1) {
      const personalEntry = l.entries[personalEntryIndex];
      return {
        ...l,
        personalEntry,
        personalEntryIndex,
      };
    }
    // TODO
    if (l.metadata.type === "TOP_N") {
      return l;
    }
    const statsForFid = await loadStatsByUserKey(userKey);
    if (statsForFid) {
      const personalEntry = await this.toLeaderboardEntry(
        statsForFid,
        l.metadata.date
      );
      return {
        ...l,
        personalEntry,
      };
    }
    return l;
  }

  async loadLeaderboard(
    identityProvider: GameIdentityProvider,
    options: LoadLeaderboardOptions
  ) {
    // if (options.type === "TOP_N") {
    //   l = await gameRepo.(
    //     identityProvider,
    //     options.n
    //   );
    // }
    if (options.type === "TOP_N") {
      return await gameRepo.loadTopNLeaderboard(identityProvider, options.n);
    }
    const { date, days } = options;
    const leaderboardDate =
      date || getDailyGameKey(addDaysToDate(new Date(), -1));
    const start = Date.now();
    const l = await gameRepo.loadLeaderboard(
      identityProvider,
      leaderboardDate,
      days
    );
    console.log("Loaded leaderboard in", Date.now() - start, "ms");
    const { userId } = options;
    if (userId == null) {
      return l;
    }
    return this.enrichLeaderboard(
      l,
      { userId: userId, identityProvider },
      this.gameRepository.loadStatsByUserKey
    );
  }

  async migrateToPg(): Promise<DBGameInsert[]> {
    const games = await this.gameRepository.loadAll();
    const inserts = [];
    console.log("Migrating games:", games.length);
    for (const game of games) {
      const pgGame: DBGame = {
        ...game,
        // will be determined from guessed game
        status: "IN_PROGRESS" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        guessCount: game.guesses.length,
        isHardMode: false,
        userData: game.userData
          ? {
              displayName: game.userData.displayName ?? null,
              username: game.userData.username ?? null,
              profileImage: game.userData.profileImage ?? null,
              bio: game.userData.bio ?? null,
              passOwnership: game.userData.passOwnership
                ? game.userData.passOwnership
                : null,
            }
          : null,
        // non-existent in old schema
        srcGameId: null,
      };
      const gg = this.toGuessedGame(pgGame);
      inserts.push({
        ...pgGame,
        isHardMode: gg.isHardMode,
        status: gg.status,
        completedAt:
          gg.status === "WON" || gg.status === "LOST"
            ? gg.isDaily
              ? new Date(gg.gameKey)
              : new Date()
            : null,
        guesses: JSON.stringify(gg.originalGuesses),
        userData: gg.userData ? JSON.stringify(gg.userData) : null,
      });
    }
    console.log("Inserting games:", inserts.length);
    try {
      // do it in batches of 500
      for (let i = 0; i < inserts.length; i += 500) {
        console.log("Batch:", i, i + 500, inserts.length);
        const batch = inserts.slice(i, i + 500);
        await gameRepo.updateToRandom(batch);
        await gameRepo.insertAll(batch);
      }
    } catch (error) {
      console.error("Error inserting games:", error);
      throw new Error("Could not insert games!");
    }
    return inserts;
  }

  async loadReplacedScore(game: GuessedGame): Promise<number | null> {
    if (!game.isDaily) {
      return null;
    }
    const userGameKey = {
      ...game,
      gameKey: getDailyGameKey(
        addDaysToDate(new Date(game.gameKey), -DEFAULT_LEADERBOARD_DAYS)
      ),
    };
    const prevGame = await gameRepo.findByUserGameKey(userGameKey);
    if (!prevGame || prevGame.status !== "WON") {
      return 6;
    }
    return prevGame.guessCount;
  }

  async loadUserData(userKey: UserKey): Promise<UserData | null> {
    const data = await gameRepo.findUserData(userKey);
    if (!data) {
      return null;
    }
    return data;
  }
}

export const gameService: GameService = new GameServiceImpl();
