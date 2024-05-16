import fs from "fs";
import path from "path";
import { ReactNode } from "react";
import { SatoriOptions, Font } from "satori";
import { ImageResponse } from "@vercel/og";

import {
  GuessedGame,
  GuessCharacter,
  PersonalLeaderboard,
  CustomGameMaker,
} from "./game/game-service";
import { UserStats, GameResult } from "./game/game-repository";

import { isPro } from "./constants";
import { LeaderboardDataItem } from "./game/game-pg-repository";
import {
  addDaysToDate,
  formatUsername,
  getDailyGameKey,
} from "./game/game-utils";
import { CUSTOM_WORD_KEY_PREFIX } from "./game/game-constants";

function readFont(name: string) {
  return fs.readFileSync(path.resolve(`./public/${name}`));
}

export const fonts: Font[] = [
  {
    name: "SpaceGrotesk",
    data: readFont("SpaceGrotesk-Regular.ttf"),
    weight: 400,
    style: "normal",
  },
  {
    name: "SpaceGrotesk",
    data: readFont("SpaceGrotesk-Bold.ttf"),
    weight: 700,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-Regular.ttf"),
    weight: 400,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-Medium.ttf"),
    weight: 500,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-SemiBold.ttf"),
    weight: 600,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-Bold.ttf"),
    weight: 700,
    style: "normal",
  },
];

export const options: SatoriOptions = {
  width: 1200,
  height: 628,
  fonts,
};

async function toImage(
  node: ReactNode,
  satoriOptions?: Partial<SatoriOptions>
) {
  return new ImageResponse(
    (
      <div
        tw="flex items-stretch w-full h-full bg-white"
        style={{ fontFamily: "Inter" }}
      >
        {node}
      </div>
    ),
    { ...options, ...satoriOptions }
  );
}

const MAX_GUESSES = 6;
const CELL_W = 84;
const CELL_H = 84;

const KEY_CELL_W = 48;
const KEY_CELL_H = 58;

const KEYS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

function determineGameMessage(
  game: GuessedGame | undefined | null,
  options?: GenerateImageOptions
) {
  const customMaker = game?.customMaker || options?.customMaker;
  if (customMaker?.isArt) {
    return `Draw with the word "${customMaker.word!.toUpperCase()}"`;
  }
  if (!game) {
    return "Let's play!";
  }
  const share = options?.share;
  if (game.status === "WON") {
    const attempts = game.guesses.length;
    let who = "You won";
    if (share) {
      if (game.userData?.username) {
        who = game.userData.username + " won";
      } else {
        who = "Won";
      }
    }
    return `🎉 ${who} in ${attempts}${game.isHardMode ? "*" : ""} attempts!`;
  }
  if (game.status === "LOST") {
    if (share || game.isCustom) {
      return "No luck this time...";
    }
    return `The correct word was "${game.word.toUpperCase()}"`;
  }
  const replacedScore = options?.replacedScore;
  if (game.guesses.length === 0) {
    if (replacedScore == null) {
      return "Start guessing...";
    }
    return (
      <div
        tw="flex flex-wrap w-full text-center items-center justify-center"
        style={{ gap: "0.5rem" }}
      >
        Win in <b>{replacedScore}</b> to keep your average!
      </div>
    );
  }
  return (
    "Keep guessing..." + (game.isHardMode && game.guesses.length > 1 ? "*" : "")
  );
}

interface UserStatsPanelProps {
  stats: UserStats;
  currentGuessCount?: number;
}

function StatLabel(props: { label: string }) {
  return (
    <div tw="flex flex-wrap text-3xl" style={{ color: primaryColor(0.54) }}>
      {props.label}
    </div>
  );
}

function StatItem(props: { label: string; value: string }) {
  return (
    <div
      tw="flex flex-col flex-1 items-center text-center flex-wrap"
      style={{ gap: "0.5rem" }}
    >
      <div tw="flex w-full justify-center" style={{ fontWeight: 500 }}>
        {props.value}
      </div>
      <div tw="flex w-full justify-center">
        <StatLabel label={props.label} />
      </div>
    </div>
  );
}

function StatGuessDistributionItem(props: {
  guessCount: number;
  amount: number;
  pctg: number;
  current: boolean;
}) {
  const { guessCount, amount, pctg, current } = props;
  return (
    <div tw="flex w-full text-3xl items-center">
      <div tw="flex w-8">{guessCount}</div>
      <div tw="flex flex-1">
        <div
          tw="flex text-white rounded px-2 py-1"
          style={{
            minWidth: `${pctg}%`,
            backgroundColor: current ? "green" : primaryColor(0.24),
          }}
        >
          {amount}
        </div>
      </div>
    </div>
  );
}

const LAST_X_CELL_W = 52;
const LAST_X_CELL_H = 52;

// TODO this will display the latest stats always
function UserStatsPanel(props: UserStatsPanelProps) {
  const { stats, currentGuessCount } = props;
  const {
    totalGames,
    totalWins,
    totalLosses,
    currentStreak,
    maxStreak,
    winGuessCounts,
    last30,
  } = stats;

  // generate last 7
  const last30Map = last30.reduce((acc, g) => {
    acc[g.date] = g;
    return acc;
  }, {} as { [key: string]: GameResult });
  const last7 = [];
  const startDate = new Date();
  for (let i = 6; i >= 0; i--) {
    const currentDate = addDaysToDate(startDate, -i);
    const dateKey = getDailyGameKey(currentDate);
    const result = last30Map[dateKey];
    last7.push(
      <div
        key={i}
        tw={`flex rounded items-center justify-center text-white text-4xl`}
        style={{
          fontWeight: 500,
          width: LAST_X_CELL_W,
          height: LAST_X_CELL_H,
          backgroundColor: result
            ? result.won
              ? "green"
              : "red"
            : primaryColor(0.24),
        }}
      >
        {result ? (result.won ? result.guessCount : "X") : ""}
      </div>
    );
  }
  // guess distribution
  const distribution = [];
  const maxWinGuessCount = Object.keys(winGuessCounts).reduce(
    (acc, key) => Math.max(acc, winGuessCounts[parseInt(key, 10)] || 0),
    0
  );
  for (let i = 1; i <= 6; i++) {
    const amount = winGuessCounts[i] || 0;
    const pctg = maxWinGuessCount > 0 ? (100 * amount) / maxWinGuessCount : 0;
    distribution.push(
      <StatGuessDistributionItem
        key={i}
        guessCount={i}
        amount={amount}
        pctg={pctg}
        current={i === currentGuessCount}
      />
    );
  }
  //

  const totalFinished = totalWins + totalLosses;
  const winPctg =
    totalFinished > 0 ? ((100 * totalWins) / totalFinished).toFixed(0) : "N/A";
  return (
    <div
      tw="flex flex-col w-full text-5xl"
      style={{
        fontFamily: "Inter",
        color: primaryColor(),
        borderColor: primaryColor(0.2),
      }}
    >
      <div
        tw="flex flex-row flex-wrap border-t py-8"
        style={{ gap: "1rem", borderColor: primaryColor(0.2) }}
      >
        <StatItem label="Played" value={`${totalGames}`} />
        <StatItem label="Win %" value={winPctg} />
        <StatItem label="Current Streak" value={`${currentStreak}`} />
        <StatItem label="Max Streak" value={`${maxStreak}`} />
      </div>
      <div
        tw="flex flex-row w-full items-center justify-between border-t pt-8 px-4"
        style={{ gap: "1rem", borderColor: primaryColor(0.2) }}
      >
        <div tw="flex">
          <StatLabel label="Last 7" />
        </div>
        <div tw="flex flex-row items-center" style={{ gap: "0.5rem" }}>
          {last7}
        </div>
      </div>
      {/* <div tw="flex flex-col w-full" style={{ gap: "0.5rem" }}>
        {distribution}
      </div> */}
    </div>
  );
}

function OGBadge() {
  return (
    <div
      tw="flex rounded"
      style={{
        color: "white",
        backgroundColor: "green",
        lineHeight: "1",
        padding: "0.1em 0.25em",
        fontWeight: 700,
        fontFamily: "SpaceGrotesk",
      }}
    >
      OG
    </div>
  );
}

export interface GenerateImageOptions {
  overlayMessage?: string | null;
  share?: boolean;
  custom?: boolean;
  customMaker?: CustomGameMaker | null;
  userStats?: UserStats | null;
  replacedScore?: number | null;
}

function getGuessCharacterColorStyle(
  c: GuessCharacter | null | undefined,
  withLetter: boolean
) {
  if (!c) {
    return {
      color: primaryColor(),
      backgroundColor: "white",
      borderColor: primaryColor(0.24),
    };
  }
  if (c.status === "CORRECT") {
    return {
      color: "white",
      backgroundColor: "green",
      borderColor: "green",
    };
  }
  if (c.status === "WRONG_POSITION") {
    return {
      color: "white",
      backgroundColor: "orange",
      borderColor: "orange",
    };
  }
  return {
    color: "white",
    borderColor: "transparent",
    backgroundColor: withLetter ? primaryColor(0.42) : primaryColor(0.24),
  };
}

function formatGameKey(
  game: GuessedGame | undefined | null,
  options?: GenerateImageOptions
) {
  if (!game && !options) {
    return "";
  }
  const gameKey = game?.gameKey || "";
  const isCustom = game?.isCustom || options?.custom;
  const customMaker = game?.customMaker || options?.customMaker;
  if (isCustom || customMaker) {
    if (customMaker) {
      const username = formatUsername(customMaker);
      return `#${customMaker?.number} by @${username}`;
    }
    if (gameKey) {
      return `From a friend 💌 (${gameKey.substring(gameKey.length - 8)})`;
    }
    return "From a friend 💌";
  }
  if (game && !game.isDaily && gameKey) {
    return `Practice (${gameKey.substring(gameKey.length - 8)})`;
  }
  return gameKey;
}

export async function generateImage(
  game: GuessedGame | undefined | null,
  options?: GenerateImageOptions
) {
  const { guesses, allGuessedCharacters } = game || { guesses: [] };
  const { overlayMessage, share, userStats } = options || {};
  const isCustom = game?.isCustom || options?.custom;
  const isArt = game?.customMaker?.isArt || options?.customMaker?.isArt;

  const rows: ReactNode[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const guess = guesses[i];
    const cells: ReactNode[] = [];
    for (let j = 0; j < 5; j++) {
      const letter = guess ? guess.characters[j] : undefined;
      const char = letter ? letter.character : "";
      const { color, backgroundColor, borderColor } =
        getGuessCharacterColorStyle(letter, !share);
      cells.push(
        <div
          key={j}
          tw="flex justify-center items-center text-5xl"
          style={{
            lineHeight: 1,
            fontWeight: 600,
            width: CELL_W,
            height: CELL_H,
            color,
            backgroundColor,
            border: "4px solid",
            borderColor,
          }}
        >
          {share ? "" : char.toUpperCase()}
        </div>
      );
    }
    rows.push(
      <div
        key={i}
        tw="flex justify-center items-center"
        style={{ gap: "0.5rem" }}
      >
        {cells}
      </div>
    );
  }

  // keyboard
  const keyboardRows = [];
  for (let i = 0; i < KEYS.length; i++) {
    const keys = KEYS[i]!;
    const keyCells: ReactNode[] = [];
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]!;
      const gc = allGuessedCharacters?.[key];
      const color =
        gc &&
        (gc.status === "CORRECT" ||
          gc.status === "WRONG_POSITION" ||
          gc.status === "INCORRECT")
          ? "white"
          : primaryColor(1);
      const backgroundColor =
        gc && gc.status === "CORRECT"
          ? "green"
          : gc && gc.status === "WRONG_POSITION"
          ? "orange"
          : gc && gc.status === "INCORRECT"
          ? primaryColor(0.42)
          : primaryColor(0.12);
      keyCells.push(
        <div
          key={j}
          tw="flex justify-center items-center rounded-md text-3xl"
          style={{
            fontWeight: 500,
            width: KEY_CELL_W,
            height: KEY_CELL_H,
            color,
            backgroundColor,
          }}
        >
          {key.toUpperCase()}
        </div>
      );
    }
    keyboardRows.push(
      <div key={i} tw="flex flex-row" style={{ gap: "0.5rem" }}>
        {keyCells}
      </div>
    );
  }

  const gameMessage = determineGameMessage(game, options);

  return toImage(
    <div tw="flex w-full h-full items-center justify-center relative">
      <div tw="flex w-full h-full items-stretch justify-between">
        <div
          tw="flex flex-col items-center justify-center p-12"
          style={{ gap: "0.5rem" }}
        >
          {rows}
        </div>
        <div
          tw={"flex flex-col flex-1 px-8 border-l pt-16"}
          style={{
            gap: "3rem",
            borderColor: primaryColor(0.2),
            backgroundColor: primaryColor(0.04),
          }}
        >
          <div
            tw="flex flex-col flex-1 items-center relative"
            style={{ gap: "1rem" }}
          >
            <div
              tw="flex items-center text-5xl flex-wrap"
              style={{
                fontFamily: "SpaceGrotesk",
                fontWeight: 700,
                wordBreak: "break-all",
                color: primaryColor(),
              }}
            >
              <div
                tw="flex flex-col items-center mb-4"
                style={{ gap: "0.5rem" }}
              >
                <div tw="flex items-center" style={{ gap: "0.75rem" }}>
                  <span>Framedl</span>
                  {isPro && <span style={{ color: "green" }}>PRO</span>}
                </div>
                <div tw="flex text-3xl items-center" style={{ gap: "0.5rem" }}>
                  <div tw="flex">{formatGameKey(game, options)}</div>
                  {isPro &&
                    (game?.userData?.passOwnership === "OG" ||
                      game?.userData?.passOwnership === "BASIC_AND_OG") && (
                      <div tw="flex text-2xl">
                        <OGBadge />
                      </div>
                    )}
                </div>
              </div>
            </div>
            <div
              tw="flex text-4xl flex-wrap"
              style={{
                fontFamily: "Inter",
                fontWeight: 400,
                wordBreak: "break-all",
                color: primaryColor(0.64),
              }}
            >
              {gameMessage}
            </div>
            {overlayMessage ? (
              <div
                tw="absolute flex items-center justify-center"
                style={{
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                <div
                  tw="flex items-center justify-center flex-wrap text-white py-4 px-8 rounded-md text-4xl shadow-lg"
                  style={{
                    backgroundColor: primaryColor(0.84),
                    wordBreak: "break-all",
                  }}
                >
                  {overlayMessage}
                </div>
              </div>
            ) : null}
          </div>
          <div tw="flex flex-col items-center justify-center pb-12">
            {(game?.status === "WON" || game?.status === "LOST") &&
            userStats ? (
              <UserStatsPanel
                stats={userStats}
                currentGuessCount={
                  game.status === "WON" ? game.guesses.length : undefined
                }
              />
            ) : (
              !share && (
                <div
                  tw="flex flex-col items-center justify-center pb-8"
                  style={{ gap: "0.5rem" }}
                >
                  {keyboardRows}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      {(isCustom || isArt) && (
        <div
          tw="absolute top-0 right-0 text-white px-5 py-3 rounded-bl-xl text-3xl"
          style={{
            fontFamily: "SpaceGrotesk",
            backgroundColor: primaryColor(),
            fontWeight: 700,
          }}
        >
          {isArt ? "🎨 ART" : "CUSTOM"}
        </div>
      )}
    </div>
  );
}

const CELL_SIZE = 34;
const OUTER_PADDING = (1200 - 30 * CELL_SIZE) / 2;
const CELL_PADDING = 4;

function createGuessCharacterCell(
  c: GuessCharacter | null | undefined,
  key: string
) {
  const { backgroundColor } = c
    ? getGuessCharacterColorStyle(c, false)
    : { backgroundColor: primaryColor(0.04) };
  return (
    <div
      key={key}
      tw="flex"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        padding: CELL_PADDING,
      }}
    >
      <div tw="flex w-full h-full" style={{ backgroundColor }} />
    </div>
  );
}

function generateSingleGameFingerprint(game: GuessedGame | null) {
  const guesses = game?.guesses || [];
  // if (guesses.length === 0) {
  //   return [
  //     <div key="0" tw="flex" style={{ width: CELL_SIZE, height: CELL_SIZE }} />,
  //   ];
  // }
  const cells: ReactNode[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const guess = guesses[i]; // - (MAX_GUESSES - guesses.length)];
    for (let j = 0; j < 5; j++) {
      const letter = guess ? guess.characters[j] : undefined;
      // if (letter) {
      cells.push(createGuessCharacterCell(letter, `f/${i}/${j}`));
      // }
    }
  }
  return cells;
}

// TODO const MIN_DATE_STRING = "2024-03-05";
const MIN_DATE_STRING = "2024-03-01";

function maxStr(a: string, b: string) {
  return a > b ? a : b;
}
function minStr(a: string, b: string) {
  return a < b ? a : b;
}

export async function generateFingerprint(
  games: GuessedGame[],
  dateStr: string | null | undefined
) {
  const lastGameDateStr = games.reduce(
    (acc, g) => maxStr(acc, g.gameKey),
    MIN_DATE_STRING
  );
  const lastDateStr = dateStr
    ? minStr(maxStr(dateStr, MIN_DATE_STRING), lastGameDateStr)
    : lastGameDateStr;
  const map = games.reduce((acc, g) => {
    acc[g.gameKey] = g;
    return acc;
  }, {} as Record<string, GuessedGame>);
  const lastDate = new Date(lastDateStr);
  const last30Games: (GuessedGame | null)[] = [];
  for (let i = 29; i >= 0; i--) {
    const currentDate = addDaysToDate(new Date(), -i);
    const dateKey = getDailyGameKey(currentDate);
    last30Games.push(map[dateKey] || null);
  }

  return toImage(
    <div
      tw="flex flex-col w-full h-full bg-white"
      style={{ padding: OUTER_PADDING }}
    >
      <div tw="flex flex-col w-full h-full">
        {last30Games.map((g, idx) => (
          <div key={idx} tw="flex flex-row w-full justify-center">
            {generateSingleGameFingerprint(g)}
          </div>
        ))}
      </div>
    </div>,
    { height: 1200 }
  );
}

export function primaryColor(opacity: number = 0.87) {
  return `rgba(31, 21, 55, ${opacity})`;
}

interface PersonalLeaderboardEntry extends LeaderboardDataItem {
  pos?: string;
  highlight: boolean;
  avg: number;
  isTop: boolean;
}

function calculateAvg(entry: LeaderboardDataItem) {
  return entry.wonCount > 0 ? entry.wonGuessCount / entry.wonCount : 0;
}

const MAX_ENTRIES = 8;

export async function generateLeaderboardImage(
  leaderboard: PersonalLeaderboard
) {
  const { entries, personalEntryIndex, personalEntry, date, days } =
    leaderboard;
  const leaderboardEntries: (PersonalLeaderboardEntry | null)[] = [];
  const personalEntryUnranked =
    personalEntry &&
    (personalEntryIndex == null || personalEntryIndex >= MAX_ENTRIES);
  const maxEntries = Math.min(
    entries.length,
    personalEntryUnranked ? MAX_ENTRIES - 1 : MAX_ENTRIES
  );
  let pos = 0;
  let isTop = true;
  for (let i = 0; i < maxEntries; i++) {
    const entry = entries[i]!;
    const prev = entries[i - 1];
    if (!prev || prev.totalGuessCount < entry.totalGuessCount) {
      pos = i + 1;
      isTop = i < 3;
    }
    leaderboardEntries.push({
      pos: `${pos}`,
      isTop,
      highlight: i === personalEntryIndex,
      avg: calculateAvg(entry),
      ...entry,
    });
  }
  if (personalEntryUnranked) {
    leaderboardEntries.push(null);
    leaderboardEntries.push({
      pos: personalEntryIndex ? `${personalEntryIndex + 1}` : "X",
      isTop: false,
      highlight: true,
      avg: calculateAvg(personalEntry),
      ...personalEntry,
    });
  }

  return toImage(
    <div
      tw="flex flex-row w-full h-full bg-white"
      style={{ color: primaryColor() }}
    >
      <div
        tw="flex flex-col justify-between h-full"
        style={{
          backgroundColor: primaryColor(0.04),
          borderRight: "1px solid",
          borderColor: primaryColor(0.2),
        }}
      >
        <div tw="flex flex-col px-12 py-12" style={{ gap: "1rem" }}>
          <div
            tw="flex text-5xl"
            style={{ fontFamily: "SpaceGrotesk", fontWeight: 700 }}
          >
            Leaderboard
          </div>
          <div
            tw="flex text-4xl"
            style={{ fontFamily: "Inter", color: primaryColor(0.87) }}
          >
            {date}
            {leaderboard.final ? "" : "*"}
          </div>
          <div tw="flex text-3xl" style={{ color: primaryColor(0.54) }}>
            Last {days} days
          </div>
        </div>
        <div tw="flex flex-col">
          <div
            tw="flex items-center text-5xl p-12 text-white"
            style={{
              fontFamily: "SpaceGrotesk",
              fontWeight: 700,
              color: primaryColor(),
              opacity: 0.2,
              gap: "0.75rem",
            }}
          >
            <span>Framedl</span>
            {isPro && <span style={{ color: "green" }}>PRO</span>}
          </div>
        </div>
      </div>
      <div
        tw="flex flex-col justify-center flex-1 px-12 py-12 text-4xl"
        style={{ gap: "1rem" }}
      >
        {leaderboardEntries.map((e, idx) =>
          e != null ? (
            <div
              key={idx}
              tw="flex flex-row items-center justify-between"
              style={{ gap: "3rem", fontWeight: e.highlight ? 600 : 400 }}
            >
              <div
                tw="flex items-center justify-center rounded text-3xl w-12 h-12 relative"
                style={
                  e.isTop
                    ? {
                        backgroundColor: primaryColor(),
                        color: "white",
                      }
                    : {
                        backgroundColor: primaryColor(
                          e.highlight ? 0.24 : 0.12
                        ),
                      }
                }
              >
                {e.pos}
                {(e.userData?.passOwnership === "OG" ||
                  e.userData?.passOwnership === "BASIC_AND_OG") && (
                  <div tw="flex absolute -top-2 -right-4 text-base">
                    <OGBadge />
                  </div>
                )}
              </div>
              <div
                tw="flex overflow-hidden"
                style={{
                  maxWidth: "330px",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {formatUsername(e)}
              </div>
              <div
                tw="flex flex-1 pt-2"
                style={{
                  backgroundColor: primaryColor(e.highlight ? 0.24 : 0.12),
                }}
              ></div>
              <div tw="flex justify-end" style={{ width: "40px" }}>
                {e.wonCount}
              </div>
              <div tw="flex justify-end" style={{ width: "80px" }}>
                {e.avg > 0 ? (
                  <div tw="flex items-end">
                    {e.avg
                      .toFixed(2)
                      .split(".")
                      .map((part, idx) =>
                        idx === 0 ? (
                          <span key={idx}>{part}</span>
                        ) : (
                          <span
                            key={idx}
                            tw="text-3xl"
                            style={{ color: primaryColor(0.54) }}
                          >
                            .{part}
                          </span>
                        )
                      )}
                  </div>
                ) : (
                  "X"
                )}
              </div>
            </div>
          ) : (
            <div key={idx} tw="flex w-full justify-between py-2">
              {Array.from({ length: 48 }).map((_, idx) => (
                <div
                  key={idx}
                  tw="flex w-1 h-1 rounded-full"
                  style={{ backgroundColor: primaryColor(0.24) }}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

interface PassOwnershipCheckFailedImageProps {
  baseUrl: string;
}

export function PassOwnershipCheckFailedImage({
  baseUrl,
}: PassOwnershipCheckFailedImageProps) {
  return (
    <div
      tw="flex flex-row w-full h-full bg-white"
      style={{ fontFamily: "Inter", color: primaryColor() }}
    >
      <div
        tw="flex items-center justify-center p-16 border-r"
        style={{
          backgroundColor: primaryColor(0.04),
          borderColor: primaryColor(0.2),
        }}
      >
        <div tw="flex">
          <img src={`${baseUrl}/pro-full.png`} width="480" height="480" />
        </div>
      </div>
      <div
        tw="flex flex-col flex-1 p-20 text-center items-center justify-center text-5xl"
        style={{ lineHeight: "1.33" }}
      >
        <div tw="flex">You need a </div>
        <div
          tw="flex"
          style={{
            fontFamily: "SpaceGrotesk",
            fontWeight: 700,
            color: primaryColor(),
            gap: "0.75rem",
          }}
        >
          Framedl <span style={{ color: "green" }}>PRO</span> Pass
        </div>
        <div tw="flex"> to participate</div>
      </div>
    </div>
  );
}
