import { NextRequest, NextResponse } from "next/server";
import {
  gameService,
  GuessedGame,
  GuessValidationStatus,
  PassRequiredError,
} from "../game/game-service";
import { baseUrl } from "../constants";
import { signUrl } from "../signer";
import { verifySnapRequest } from "../snap/verify";

// Same media type as a snap — the "frap" experiment is just a different
// rendering style (image-only) of the same protocol.
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

// Reuse the existing v1-frames image generator. It already renders the
// board, keyboard, messages (via `msg`), and end-screen stats.
const FRAP_ASPECT_RATIO = "16:9";

function buildGameImageUrlById(gid: string): string {
  const params = new URLSearchParams();
  params.append("gid", gid);
  params.append("ar", FRAP_ASPECT_RATIO);
  // For shared/view links the game is already finished, so the URL is
  // stable — no cache-buster needed.
  return signUrl(`${baseUrl}/api/images?${params.toString()}`);
}

function buildGameImageUrl(game: GuessedGame, message?: string): string {
  const params = new URLSearchParams();
  params.append("gid", game.id);
  if (message) params.append("msg", message);
  params.append("ar", FRAP_ASPECT_RATIO);
  // Cache-buster per guess so clients don't hold a stale tile mid-game.
  params.append("gc", String(game.guesses.length));
  return signUrl(`${baseUrl}/api/images?${params.toString()}`);
}

// Static welcome image — no game id yet. We point at the same image
// endpoint with no game; if your generator handles `gid` absence with a
// branded splash that's perfect, otherwise swap this for a static asset.
function buildWelcomeImageUrl(message?: string): string {
  const params = new URLSearchParams();
  if (message) params.append("msg", message);
  params.append("ar", FRAP_ASPECT_RATIO);
  return signUrl(`${baseUrl}/api/images?${params.toString()}`);
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

function viewFrap(gid: string): SnapResponse {
  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["board", "playBtn", "openAppBtn"],
        },
        board: {
          type: "image",
          props: {
            url: buildGameImageUrlById(gid),
            aspect: FRAP_ASPECT_RATIO,
            alt: "Framedl result",
          },
        },
        playBtn: {
          type: "button",
          props: { label: "Play your own", variant: "primary" },
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
      },
    },
  };
}

function welcomeFrap(message?: string): SnapResponse {
  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["board", "playBtn", "openAppBtn"],
        },
        board: {
          type: "image",
          props: {
            url: buildWelcomeImageUrl(message),
            aspect: "16:9",
            alt: "Framedl",
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
      },
    },
  };
}

function gameFrap(game: GuessedGame, message?: string): SnapResponse {
  const children = ["board"];
  const elements: Record<string, SnapElement> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children,
    },
    board: {
      type: "image",
      props: {
        url: buildGameImageUrl(game, message),
        aspect: "16:9",
        alt: "Framedl board",
      },
    },
  };

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
      props: { label: "Guess", variant: "primary", icon: "send" },
      on: { press: { action: "submit", params: { op: "guess" } } },
    };
    children.push("word", "guessBtn");
  } else {
    elements.shareBtn = {
      type: "button",
      props: { label: "Share", variant: "primary", icon: "share" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: buildShareText(game),
            embeds: [`${baseUrl}/frap?gid=${game.id}`],
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
    children.push("shareBtn", "openAppBtn");
  }

  return {
    version: "1.0",
    theme: { accent: "purple" },
    effects:
      game.status === "WON" && game.guesses.length > 0 ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
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

export async function GET(req: NextRequest) {
  const gid = new URL(req.url).searchParams.get("gid");
  if (gid) {
    const game = await gameService.load(gid);
    if (game) {
      return snapJson(viewFrap(gid));
    }
  }
  return snapJson(welcomeFrap());
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
    console.warn("frap: rejected request —", verified.reason);
    return snapJson(
      welcomeFrap("Could not verify your Farcaster signature. Try again."),
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
      return snapJson(welcomeFrap("A Framedl PRO Pass is required to play!"));
    }
    console.error("frap loadOrCreate failed", e);
    return snapJson(welcomeFrap("Something went wrong. Try again."));
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
        console.error("frap guess failed", e);
        message = "Could not submit guess";
      }
    } else {
      message = validationMessage(validation);
    }
  }

  return snapJson(gameFrap(game, message));
}
