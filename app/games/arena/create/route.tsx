/* eslint-disable react/jsx-key */
import { createCustomFrames } from "@/app/games/frames";
import { Button } from "frames.js/next";
import { error, redirect } from "frames.js/core";
import { ArenaAudienceMember, ArenaConfig } from "@/app/db/pg/types";
import { insertArena } from "@/app/game/arena-pg-repository";
import { loadUserData, loadUsername, loadFid } from "@/app/games/user-data";
import { gameService } from "@/app/game/game-service";
import { createComposeUrl } from "@/app/utils";
import { notifyArenaMembers } from "../arena-utils";
import { buildArenaShareText } from "@/app/game/arena-utils";

export function formatDuration(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts = [];
  if (d) {
    parts.push(`${d}d`);
  }
  if (h) {
    parts.push(`${h}h`);
  }
  if (m) {
    parts.push(`${m}m`);
  }
  return parts.join(" ");
}

const parseAudience = async (input: string): Promise<ArenaAudienceMember[]> => {
  const all: Promise<ArenaAudienceMember>[] = input
    .split(",")
    .map((a) => a.trim())
    .map(async (a) => {
      if (a.startsWith("@")) {
        const username = a.substring(1);
        const fid = await loadFid(username);
        if (!fid) {
          throw new Error(`User ${username} not found.`);
        }
        return {
          username: username,
          userId: fid.toString(),
          identityProvider: "fc" as const,
        };
      }
      const fid = parseInt(a, 10);
      if (isNaN(fid)) {
        throw new Error("Invalid FID / username, use '@' for usernames.");
      }
      const userId = fid.toString();
      const username = await loadUsername({
        userId,
        identityProvider: "fc" as const,
      });
      return {
        userId,
        username,
        identityProvider: "fc" as const,
      };
    });
  return (await Promise.all(all)).slice(0, 10);
};

function buildRedirectUrl(arenaConfig: ArenaConfig, arenaUrl: string): string {
  const { audience, audienceSize } = arenaConfig;
  const message = buildArenaShareText({ audience, audienceSize });
  const redirectUrl = createComposeUrl(message, arenaUrl);
  return redirectUrl;
}

export type ArenaBuilderState = Partial<Omit<ArenaConfig, "words">> & {
  step: number;
  wordCount?: number;
  from?: string;
};
const initialState: ArenaBuilderState = {
  step: 1,
};
const frames = createCustomFrames<ArenaBuilderState>(initialState);

const handle = frames(async (ctx) => {
  const { searchParams, state, message, userKey } = ctx;

  const step = searchParams?.step ? parseInt(searchParams.step, 10) : 0;
  const nextState = { ...state, step, from: state.from || searchParams.from };
  const prevStep = Math.max(0, step - 1);
  const nextStep = Math.min(step + 1, 6);
  const input = message?.inputText?.trim();

  if (searchParams?.done === "true") {
    if (!userKey) {
      return error("You are not authenticated!");
    }
    const config = {
      audience: state.audience ?? [],
      audienceSize: state.audienceSize ?? 2,
      duration: state.duration ?? { type: "unlimited" },
      start: state.start ?? { type: "immediate" },
      words: gameService.generateRandomWords(state.wordCount ?? 1),
      suddenDeath: null,
      initWords: null,
      randomWords: null,
      isHardModeRequired: null,
    } satisfies ArenaConfig;
    const userData = await loadUserData(userKey);
    const arena = {
      createdAt: new Date(),
      updatedAt: new Date(),
      config: JSON.stringify(config),
      ...userKey,
      members: "[]",
      userData: JSON.stringify(userData),
    };
    const id = await insertArena(arena);
    const arenaUrl = ctx.createExternalUrl(`/games/arena/${id}/join`);
    const shareUrl = buildRedirectUrl(config, arenaUrl);
    return redirect(shareUrl);
  }

  // audience size
  if (state.step === 1 && step === 2) {
    if (input) {
      const size = parseInt(input, 10);
      if (isNaN(size) || size < 2 || size > 100) {
        return error("Invalid audience size, must be between 2 and 100.");
      }
      nextState.audienceSize = size;
    } else {
      nextState.audienceSize = 2;
    }
  }
  // audience
  if (state.step === 2 && step === 3) {
    if (input) {
      try {
        nextState.audience = await parseAudience(input);
      } catch (e: any) {
        return error(e.message);
      }
    } else {
      nextState.audience = [];
    }
  }
  // words
  if (state.step === 3 && step === 4) {
    if (input) {
      const words = parseInt(input, 10);
      if (isNaN(words) || words < 1 || words > 24) {
        return error("Invalid number of words, must be between 1 and 24.");
      }
      nextState.wordCount = words;
    } else {
      nextState.wordCount = 5;
    }
  }
  // start date
  if (state.step === 4 && step === 5) {
    if (input) {
      if (input === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        nextState.start = {
          type: "scheduled",
          date: tomorrow.toISOString().substring(0, 10),
        };
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        nextState.start = { type: "scheduled", date: input };
      } else {
        return error("Invalid date format, use YYYY-MM-DD.");
      }
    } else {
      nextState.start = { type: "immediate" };
    }
  }
  // duration
  if (state.step === 5 && step === 6) {
    if (input) {
      const r = /^((\d+)d\s*)?((\d+)h\s*)?((\d+)m\s*)?$/;
      const match = input.match(r);
      if (!match) {
        return error("Invalid duration format, use '1d 3h', '30m'...");
      }
      const days = parseInt(match[2] || "0", 10);
      const hours = parseInt(match[4] || "0", 10);
      const minutes = parseInt(match[6] || "0", 10);

      const m = days * 1440 + hours * 60 + minutes;
      nextState.duration = { type: "interval", minutes: m };
    } else {
      nextState.duration = { type: "unlimited" };
    }
  }

  const textInput: string | undefined =
    step > 0 && step < 6 ? "Enter your choice..." : undefined;

  return {
    state: nextState,
    image: ctx.createSignedUrlWithBasePath({
      pathname: "/arena/create/image",
      query: {
        step: step.toString(),
        state: JSON.stringify(nextState),
      },
    }),
    textInput,
    buttons:
      step === 0
        ? [
            nextState.from === "create" ? (
              <Button
                action="post"
                target={ctx.createUrlWithBasePath("/create")}
              >
                ⬅️ Back
              </Button>
            ) : undefined,
            <Button
              action="post"
              target={ctx.createUrlWithBasePath(
                `/arena/create?step=${nextStep}`
              )}
            >
              {"Let's go"}
            </Button>,
          ]
        : [
            <Button
              action="post"
              target={ctx.createUrlWithBasePath(
                `/arena/create?step=${prevStep}`
              )}
            >
              ⬅️ Back
            </Button>,
            step === 6 ? (
              <Button
                action="post_redirect"
                target={ctx.createUrlWithBasePath(`/arena/create?done=true`)}
              >
                Share
              </Button>
            ) : (
              <Button
                action="post"
                target={ctx.createUrlWithBasePath(
                  `/arena/create?step=${nextStep}`
                )}
              >
                Confirm
              </Button>
            ),
          ],
  };
});

export const POST = handle;
export const GET = handle;
