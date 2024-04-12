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
import { Leaderboard, LeaderboardDataItem } from "./game-pg-repository";
import answers from "../words/answer-words";
import allWords from "../words/all-words";
import { isPro } from "../constants";
import { DBGame, DBGameInsert } from "../db/pg/types";
import { v4 as uuidv4 } from "uuid";

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

const getWordForUserGameKey = (userGameKey: UserGameKey): string => {
  const seed =
    userGameKey.identityProvider +
    "/" +
    shuffleSecret +
    (isPro ? `/pro/${userGameKey.userId}` : "");
  if (userGameKey.isDaily) {
    return getWordForDateString(userGameKey.gameKey, seed);
  }

  const rng = seedrandom(seedSalt + "/" + userGameKey.gameKey);
  return getWordForIndex(Math.floor(rng() * answers.length), seed);
};

export interface GuessCharacter {
  character: string;
  status: "CORRECT" | "WRONG_POSITION" | "INCORRECT";
}

export interface Guess {
  characters: GuessCharacter[];
}

export interface GuessedGame extends Omit<DBGame, "guesses"> {
  originalGuesses: string[];
  guesses: Guess[];
  allGuessedCharacters: Record<string, GuessCharacter>;
  status: "IN_PROGRESS" | "WON" | "LOST";
  word: string;
  isHardMode: boolean;
}

export interface PublicGuessedGame {
  id: string;
  gameKey: string;
  guesses: Guess[];
  status: "IN_PROGRESS" | "WON" | "LOST";
  isHardMode: boolean;
  word?: string;
}

export type GuessValidationStatus =
  | "VALID"
  | "INVALID_EMPTY"
  | "INVALID_SIZE"
  | "INVALID_FORMAT"
  | "INVALID_WORD";

export interface GameService {
  loadOrCreate(
    userGameKey: UserGameKey,
    userData?: UserData
  ): Promise<GuessedGame>;
  load(id: string): Promise<GuessedGame | null>;
  loadAllDailiesByUserKey(userKey: UserKey): Promise<GuessedGame[]>;
  loadPublic(id: string, personal: boolean): Promise<PublicGuessedGame | null>;
  guess(game: GuessedGame, guess: string): Promise<GuessedGame>;
  isValidGuess(guess: string): boolean;
  validateGuess(guess: string | null | undefined): GuessValidationStatus;
  loadStats(userKey: UserKey): Promise<UserStats | null>;
  loadLeaderboard(
    userId: string | null | undefined,
    identityProvider: GameIdentityProvider,
    date?: string
  ): Promise<PersonalLeaderboard>;
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
    return this.getDayString(new Date());
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

  private toGuessedGame(game: DBGame): GuessedGame {
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
    return {
      ...game,
      originalGuesses: game.guesses,
      guesses,
      allGuessedCharacters,
      status,
      word,
      isHardMode,
    };
  }

  private getDayString(date: Date): string {
    return date.toISOString().split("T")[0]!;
  }

  async loadOrCreate(
    key: UserGameKey,
    userData?: UserData
  ): Promise<GuessedGame> {
    const game = await gameRepo.findByUserGameKey(key);
    if (!game) {
      const word = getWordForUserGameKey(key);
      const newGame = {
        ...key,
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
      const createdGame = await gameRepo.insert(newGame);
      return {
        ...createdGame,
        guesses: [],
        originalGuesses: [],
        allGuessedCharacters: {},
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
      return guessedGame;
    }
    return {
      id: game.id,
      gameKey: game.gameKey,
      isHardMode: guessedGame.isHardMode,
      guesses: guessedGame.guesses.map((g) => {
        return {
          characters: g.characters.map((c) => {
            return { status: c.status, character: "" };
          }),
        };
      }),
      status: guessedGame.status,
    };
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
      );
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
    const next = new Date(prev.getTime() + 1000 * 60 * 60 * 24);
    return this.getDayString(next) === currentDate;
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
    if (!this.isValidGuess(guess)) {
      throw new Error("Guess must be 5 letters");
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
    await gameRepo.update(game.id, {
      ...game,
      guesses: JSON.stringify(game.guesses),
      guessCount: game.guesses.length,
      userData: game.userData ? JSON.stringify(game.userData) : null,
      updatedAt: new Date(),
      completedAt: isGameFinished ? new Date() : null,
      status: resultGame.status,
    });
    if (isGameFinished && game.isDaily) {
      // update stats
      const stats = await this.loadOrCreateStats(guessedGame);
      const newStats = this.updateStats(stats, resultGame);
      this.gameRepository.saveStats(newStats);
      // update leaderboard !!! POSSIBLE RACE CONDITION !!!
      // const l = await this.loadLeaderboard(null, guessedGame.identityProvider);
      // const updatedLeaderboard = await this.updateLeaderboard(savedStats, l);
      // await this.gameRepository.saveLeaderboard(
      //   guessedGame.identityProvider,
      //   updatedLeaderboard
      // );
    }
    return resultGame;
  }

  async loadStats(userKey: UserKey): Promise<UserStats | null> {
    return this.gameRepository.loadStatsByUserKey(userKey);
  }

  validateGuess(guess: String | null | undefined) {
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
    if (!allWords.includes(formattedGuess)) {
      return "INVALID_WORD";
    }
    return "VALID";
  }

  isValidGuess(guess: string): boolean {
    return this.validateGuess(guess) === "VALID";
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
      : new Date(new Date(lastDate).getTime() - 1000 * 60 * 60 * 24);
    const last14: GameResult[] = [];
    let lastPlayedDate: string | undefined = undefined;
    let wonCount = 0;
    let lostCount = 0;
    let unplayedCount = 0;
    let wonGuessCount = 0;
    let totalGuessCount = 0;
    for (let i = 13; i >= 0; i--) {
      const date = new Date(toDate.getTime() - 1000 * 60 * 60 * 24 * i);
      const dateKey = this.getDayString(date);
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
      const lastGame = await this.gameRepository.loadByUserGameKey({
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
      maxGameKey: lastPlayedDate ?? null,
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
      (e) => e.userId === userKey.userId
    );
    if (personalEntryIndex !== -1) {
      const personalEntry = l.entries[personalEntryIndex];
      return {
        ...l,
        personalEntry,
        personalEntryIndex,
      };
    }
    const statsForFid = await loadStatsByUserKey(userKey);
    if (statsForFid) {
      const personalEntry = await this.toLeaderboardEntry(statsForFid, l.date);
      return {
        ...l,
        personalEntry,
      };
    }
    return l;
  }

  // private sortLeaderboardEntries(
  //   entries: LeaderboardEntry[]
  // ): LeaderboardEntry[] {
  //   return [...entries].sort((a, b) => b.score - a.score).slice(0, 10);
  // }

  // private async updateLeaderboard(
  //   stats: UserStats,
  //   l: Leaderboard
  // ): Promise<Leaderboard> {
  //   const entries = [...l.entries];
  //   const personalEntryIndex = entries.findIndex(
  //     (e) => e.userId === stats.userId
  //   );
  //   const personalEntry = await this.toLeaderboardEntry(stats, l.date);
  //   if (stats.userId === "11124") {
  //     return l;
  //   }
  //   if (personalEntryIndex !== -1) {
  //     entries[personalEntryIndex] = personalEntry;
  //   } else {
  //     entries.push(personalEntry);
  //   }
  //   const lastDate = stats.last30[stats.last30.length - 1]?.date;
  //   return {
  //     ...l,
  //     date: lastDate && lastDate > l.date ? lastDate : l.date,
  //     entries: this.sortLeaderboardEntries(entries),
  //     lastUpdatedAt: Date.now(),
  //   };
  // }

  async loadLeaderboard(
    userId: string | null | undefined,
    identityProvider: GameIdentityProvider,
    date?: string
  ): Promise<PersonalLeaderboard> {
    const leaderboardDate =
      date ||
      new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split("T")[0]!;
    const l = await gameRepo.loadLeaderboard(identityProvider, leaderboardDate);
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
      };
      const gg = this.toGuessedGame(pgGame);
      inserts.push({
        ...pgGame,
        isHardMode: gg.isHardMode,
        status: gg.status,
        completedAt:
          gg.status === "WON" || gg.status === "LOST" ? new Date() : null,
        guesses: JSON.stringify(gg.originalGuesses),
        userData: gg.userData ? JSON.stringify(gg.userData) : null,
      });
    }
    await gameRepo.insertAll(inserts);
    return inserts;
  }
}

export const gameService: GameService = new GameServiceImpl();
