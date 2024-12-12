import { UserData, UserKey } from "./game-repository";
import { PublicGuessedGame } from "./game-service";

function buildResultText(game: PublicGuessedGame) {
  return game.guesses
    .map((guess, i) => {
      return guess.characters
        .map((letter, j) => {
          return letter.status === "CORRECT"
            ? "🟩"
            : letter.status === "WRONG_POSITION"
            ? "🟨"
            : "⬜";
        })
        .join("");
    })
    .join("\n");
}

interface UserProfile extends UserKey {
  userData?: UserData | undefined | null;
}

export function formatUsername(user: UserProfile, mention?: boolean) {
  const { userId, userData } = user;
  let name;
  if (userData?.username) {
    name = userData.username;
  } else {
    name = `!${userId}`;
  }
  if (!mention) {
    return name;
  }
  return `@${name}`;
}

export function formatGameKey(game: PublicGuessedGame) {
  const { gameKey } = game;
  if (game.isCustom && game.customMaker) {
    const username = formatUsername(game.customMaker, true);
    return `#${game.customMaker.number} by ${username}`;
  }
  if (game.arenaId != null) {
    return `Arena ${game.arenaId} (#${game.arenaWordIndex})`;
  }
  if (!game.isDaily) {
    const subKey = gameKey.substring(gameKey.length - 8);
    if (!game.isCustom) {
      return `Practice`;
    }
    return subKey;
  }
  return gameKey;
}

export function buildShareableResult(
  game: PublicGuessedGame | null | undefined,
  config: { isPro: boolean }
) {
  if (!game) {
    return {
      title: "Framedl",
      text: `Play Framedl!`,
    };
  }
  const guessCount = game.status === "WON" ? `${game.guesses.length}` : "X";
  const title = `Framedl ${config.isPro ? "PRO " : ""}${formatGameKey(
    game
  )} ${guessCount}/6${game.isHardMode ? "*" : ""}`;
  const text = buildResultText(game);
  return { title, text };
}

export function addDaysToDate(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getDailyGameKey(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

export function getDateFromDailyGameKey(gameKey: string): Date {
  return new Date(gameKey);
}

function pluralize(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function formatDurationSimple(durationInMinutes: number) {
  const days = Math.floor(durationInMinutes / 60 / 24);
  if (days > 1) {
    return pluralize(days, "day");
  }
  const hours = Math.floor((durationInMinutes % (60 * 24)) / 60);
  if (days === 1) {
    if (hours > 0) {
      return `1 day and ${pluralize(hours, "hour")}`;
    }
    return "1 day";
  }
  if (hours > 12) {
    return pluralize(hours, "hour");
  }
  const minutes = durationInMinutes % 60;
  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} hour${hours === 1 ? "" : "s"} and ${pluralize(
        minutes,
        "minute"
      )}`;
    }
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return pluralize(Math.max(1, minutes), "minute");
}
