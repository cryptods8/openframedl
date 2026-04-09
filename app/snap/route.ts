import { NextRequest, NextResponse } from "next/server";
import {
  gameService,
  GuessCharacter,
  GuessedGame,
  GuessValidationStatus,
  PassRequiredError,
} from "../game/game-service";
import { UserStats } from "../game/game-repository";
import { baseUrl } from "../constants";
import { verifySnapRequest } from "./verify";

// Farcaster snap content type
const SNAP_CONTENT_TYPE = "application/vnd.farcaster.snap+json";

export const dynamic = "force-dynamic";

type SnapElement = {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  on?: Record<string, { action: string; params?: Record<string, unknown> }>;
};

type SnapResponse = {
  version: "1.0";
  theme?: { accent?: string };
  effects?: string[];
  ui: {
    root: string;
    elements: Record<string, SnapElement>;
  };
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
  Vary: "Accept",
};

function snapJson(body: SnapResponse) {
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": SNAP_CONTENT_TYPE,
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function cellColor(status: GuessCharacter["status"]): string {
  switch (status) {
    case "CORRECT":
      return "green";
    case "WRONG_POSITION":
      return "amber";
    case "INCORRECT":
    default:
      return "gray";
  }
}

function buildGridCells(game: GuessedGame) {
  const cells: Array<{
    row: number;
    col: number;
    color: string;
    content?: string;
  }> = [];
  for (let r = 0; r < 6; r++) {
    const guess = game.guesses[r];
    for (let c = 0; c < 5; c++) {
      const ch = guess?.characters[c];
      if (ch) {
        cells.push({
          row: r,
          col: c,
          color: cellColor(ch.status),
          content: ch.character.toUpperCase(),
        });
      } else {
        cells.push({ row: r, col: c, color: "purple" });
      }
    }
  }
  return cells;
}

const KEYBOARD_ROWS: string[] = [
  "QWERTYUIOP",
  "ASDFGHJKL",
  "ZXCVBNM",
];
const KEYBOARD_COLS = 10;

function buildKeyboardCells(game: GuessedGame) {
  const cells: Array<{
    row: number;
    col: number;
    color: string;
    content?: string;
  }> = [];
  for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
    const row = KEYBOARD_ROWS[r]!;
    // Center shorter rows.
    const offset = Math.floor((KEYBOARD_COLS - row.length) / 2);
    for (let c = 0; c < KEYBOARD_COLS; c++) {
      const letterIdx = c - offset;
      if (letterIdx < 0 || letterIdx >= row.length) {
        cells.push({ row: r, col: c, color: "white" });
        continue;
      }
      const letter = row[letterIdx]!;
      const guessed = game.allGuessedCharacters[letter.toLowerCase()];
      cells.push({
        row: r,
        col: c,
        color: guessed ? cellColor(guessed.status) : "purple",
        content: letter,
      });
    }
  }
  return cells;
}

function formatCountdown(msUntil: number): string {
  if (msUntil <= 0) return "any moment now";
  const totalMinutes = Math.floor(msUntil / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function msUntilNextDaily(): number {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return next - now.getTime();
}

function buildShareText(game: GuessedGame): string {
  const guessCount = game.status === "WON" ? `${game.guesses.length}` : "X";
  const hardMark = game.isHardMode ? "*" : "";
  const board = game.guesses
    .map((g) =>
      g.characters
        .map((c) => {
          if (c.status === "CORRECT") return "\uD83D\uDFE9"; // 🟩
          if (c.status === "WRONG_POSITION") return "\uD83D\uDFE8"; // 🟨
          return "\u2B1B"; // ⬛
        })
        .join(""),
    )
    .join("\n");
  return `Framedl ${game.gameKey} ${guessCount}/6${hardMark}\n\n${board}`;
}

function welcomeSnap(message?: string): SnapResponse {
  const elements: Record<string, SnapElement> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: [
        "title",
        "desc",
        ...(message ? ["msg"] : []),
        "playBtn",
        "openAppBtn",
      ],
    },
    title: {
      type: "text",
      props: {
        content: "Framedl",
        size: "md",
        weight: "bold",
        align: "center",
      },
    },
    desc: {
      type: "text",
      props: {
        content: "Guess today's 5-letter word in 6 tries",
        align: "center",
      },
    },
    playBtn: {
      type: "button",
      props: { label: "Play Daily", variant: "primary" },
      on: { press: { action: "submit", params: { op: "play" } } },
    },
    openAppBtn: {
      type: "button",
      props: {
        label: "Open Framedl",
        variant: "secondary",
        icon: "arrow-right",
      },
      on: {
        press: {
          action: "open_mini_app",
          params: { target: `${baseUrl}/app/v2` },
        },
      },
    },
  };
  if (message) {
    elements.msg = {
      type: "text",
      props: { content: message, align: "center" },
    };
  }
  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: { root: "page", elements },
  };
}

function gameSnap(
  game: GuessedGame,
  message?: string,
  stats?: UserStats | null,
): SnapResponse {
  const guessesUsed = game.guesses.length;
  const headerContent =
    game.status === "IN_PROGRESS"
      ? `Framedl — Guess ${guessesUsed + 1}/6`
      : "Framedl";

  const children = ["header"];
  const elements: Record<string, SnapElement> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children,
    },
    header: {
      type: "text",
      props: { content: headerContent, weight: "bold", align: "center" },
    },
    grid: {
      type: "cell_grid",
      props: {
        cols: 5,
        rows: 6,
        rowHeight: 40,
        gap: "sm",
        cells: buildGridCells(game),
      },
    },
    keyboard: {
      type: "cell_grid",
      props: {
        cols: KEYBOARD_COLS,
        rows: KEYBOARD_ROWS.length,
        rowHeight: 24,
        gap: "sm",
        cells: buildKeyboardCells(game),
      },
    },
  };

  if (message) {
    elements.msg = {
      type: "text",
      props: { content: message, align: "center" },
    };
    children.push("msg");
  }

  children.push("grid", "keyboard");

  if (game.status === "IN_PROGRESS") {
    elements.word = {
      type: "input",
      props: {
        name: "word",
        type: "text",
        label: "Your guess",
        placeholder: "5 letters",
        maxLength: 5,
      },
    };
    elements.guessBtn = {
      type: "button",
      props: { label: "Guess", variant: "primary" },
      on: { press: { action: "submit", params: { op: "guess" } } },
    };
    children.push("word", "guessBtn");
  } else {
    const resultText =
      game.status === "WON"
        ? `You won in ${guessesUsed}! Word: ${game.word.toUpperCase()}`
        : `Game over. Word: ${game.word.toUpperCase()}`;
    elements.result = {
      type: "text",
      props: { content: resultText, weight: "bold", align: "center" },
    };
    children.push("result");

    if (stats) {
      const winRate =
        stats.totalGames > 0
          ? Math.round((stats.totalWins / stats.totalGames) * 100)
          : 0;
      elements.statCurrent = {
        type: "item",
        props: {
          title: `${stats.currentStreak}`,
          description: "Current streak",
        },
      };
      elements.statMax = {
        type: "item",
        props: {
          title: `${stats.maxStreak}`,
          description: "Max streak",
        },
      };
      elements.statWins = {
        type: "item",
        props: {
          title: `${stats.totalWins}/${stats.totalGames}`,
          description: `Wins (${winRate}%)`,
        },
      };
      elements.statsGroup = {
        type: "item_group",
        props: { separator: true },
        children: ["statCurrent", "statMax", "statWins"],
      };
      children.push("statsGroup");
    }

    elements.countdown = {
      type: "text",
      props: {
        content: `Next daily in ${formatCountdown(msUntilNextDaily())}`,
        size: "sm",
        align: "center",
      },
    };
    elements.shareBtn = {
      type: "button",
      props: { label: "Share", variant: "primary", icon: "share" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: buildShareText(game),
            embeds: [`${baseUrl}/snap`],
          },
        },
      },
    };
    elements.openAppBtn = {
      type: "button",
      props: {
        label: "Open Framedl",
        variant: "secondary",
        icon: "arrow-right",
      },
      on: {
        press: {
          action: "open_mini_app",
          params: { target: `${baseUrl}/app/v2` },
        },
      },
    };
    children.push("countdown", "shareBtn", "openAppBtn");
  }

  return {
    version: "1.0",
    theme: { accent: "purple" },
    effects:
      game.status === "WON" && game.guesses.length > 0 ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  } as SnapResponse;
}

function validationMessage(status: GuessValidationStatus): string {
  switch (status) {
    case "INVALID_EMPTY":
      return "Enter a 5-letter word";
    case "INVALID_SIZE":
    case "INVALID_FORMAT":
      return "Must be exactly 5 letters";
    case "INVALID_WORD":
      return "Not in the word list";
    case "INVALID_ALREADY_GUESSED":
      return "Already guessed";
    case "INVALID_HARD_MODE":
      return "Hard mode: reuse revealed hints";
    default:
      return "Invalid guess";
  }
}

function wantsSnap(req: NextRequest): boolean {
  const accept = req.headers.get("accept") || "";
  return accept.includes(SNAP_CONTENT_TYPE);
}

function nonSnapFallback() {
  // Cast clients without snap support fall back here. Point them at the
  // main Framedl page so the URL still renders as a usable embed.
  const target = `${baseUrl}/`;
  return NextResponse.redirect(target, {
    status: 302,
    headers: {
      ...CORS_HEADERS,
      Link: `<${baseUrl}/snap>; rel="alternate"; type="${SNAP_CONTENT_TYPE}"`,
    },
  });
}

export async function GET(req: NextRequest) {
  //if (!wantsSnap(req)) {
  //  return nonSnapFallback();
  //}
  return snapJson(welcomeSnap());
}

export async function POST(req: NextRequest) {
  let rawBody: unknown = {};
  try {
    rawBody = await req.json();
  } catch {
    // ignore — treat as empty
  }

  const verified = await verifySnapRequest(rawBody);
  if (!verified.valid) {
    console.warn("snap: rejected request —", verified.reason);
    return snapJson(
      welcomeSnap("Could not verify your Farcaster signature. Try again."),
    );
  }

  const { fid, payload } = verified;
  const inputs = payload.inputs || {};

  const userKey = {
    userId: String(fid),
    identityProvider: "fc" as const,
  };

  let game: GuessedGame;
  try {
    game = await gameService.loadOrCreate({
      ...userKey,
      gameKey: gameService.getDailyKey(),
      isDaily: true,
    });
  } catch (e) {
    if (e instanceof PassRequiredError) {
      return snapJson(welcomeSnap("A Framedl PRO Pass is required to play!"));
    }
    console.error("snap loadOrCreate failed", e);
    return snapJson(welcomeSnap("Something went wrong. Try again."));
  }

  let message: string | undefined;
  const rawWord = inputs.word;
  const word = typeof rawWord === "string" ? rawWord.trim() : "";

  if (word && game.status === "IN_PROGRESS") {
    const validation = gameService.validateGuess(game, word);
    if (validation === "VALID") {
      try {
        game = await gameService.guess(game, word);
      } catch (e) {
        console.error("snap guess failed", e);
        message = "Could not submit guess";
      }
    } else {
      message = validationMessage(validation);
    }
  }

  let stats: UserStats | null = null;
  if (game.status !== "IN_PROGRESS") {
    try {
      stats = await gameService.loadStats(userKey);
    } catch (e) {
      console.error("snap loadStats failed", e);
    }
  }

  return snapJson(gameSnap(game, message, stats));
}
