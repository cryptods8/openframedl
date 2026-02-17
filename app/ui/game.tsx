"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  GuessCharacter,
  ClientGame,
  GuessValidationStatus,
} from "../game/game-service";
import { GameGuessGrid } from "./game-guess-grid";
import { Button } from "./button/button";
import { buildShareableResult, formatGameKey } from "../game/game-utils";
import { createCast } from "../lib/cast";
import { SignIn } from "./auth/sign-in";
import { createComposeUrl } from "../utils";
import { GameOptionsMenu } from "./game/game-options-menu";
import { useSession } from "next-auth/react";
import { useJwt } from "../hooks/use-jwt";
import { useSessionId } from "../hooks/use-session-id";
import { UserData } from "../game/game-repository";
import { GameCompletedDialog } from "./game-completed-dialog";
import { useAppConfig } from "../contexts/app-config-context";
import { toast } from "./toasts/toast";
import { BaseUserRequest } from "../api/api-utils";
import { useLocalStorage } from "../hooks/use-local-storage";
import { useHaptics } from "../hooks/use-haptics";
import { ProPassRequiredScreen } from "./game/pro-pass-required-screen";
import { useRouter } from "next/navigation";
import { GameIntroDialog } from "./game-intro-dialog";

// TODO: move to common file
const KEYS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

function BackspaceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
      <path d="m12 9 6 6" />
      <path d="m18 9-6 6" />
    </svg>
  );
}

function GameKeyboardKey({
  keyboardKey,
  onPress,
  compact,
  status,
}: {
  keyboardKey: string;
  onPress: (key: string) => void;
  status?: GuessCharacter["status"];
  compact?: boolean;
}) {
  // Add state for tracking the repeat interval
  const [repeatInterval, setRepeatInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Initial delay before repeat starts (in ms)
  const INITIAL_DELAY = 500;
  // Interval between repeats (in ms)
  const REPEAT_INTERVAL = 30;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onPress(keyboardKey);

    if (keyboardKey === "enter") {
      return;
    }

    // Only set up repeat for backspace
    // if (keyboardKey === "backspace") {
    const timeout = setTimeout(() => {
      // Start repeating after initial delay
      onPress(keyboardKey);
      const interval = setInterval(() => {
        onPress(keyboardKey);
      }, REPEAT_INTERVAL);
      setRepeatInterval(interval);
    }, INITIAL_DELAY);

    // Store the timeout so we can clear it on mouse up
    setRepeatInterval(timeout);
    // }
  };

  const handleMouseUp = () => {
    if (repeatInterval) {
      clearTimeout(repeatInterval);
      clearInterval(repeatInterval);
      setRepeatInterval(null);
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (repeatInterval) {
        clearTimeout(repeatInterval);
        clearInterval(repeatInterval);
      }
    };
  }, [repeatInterval]);

  return (
    <button
      className={clsx(
        "w-full font-semibold flex items-center justify-center select-none",
        compact ? "h-8 text-xs" : "h-12",
        "active:outline active:outline-2 active:outline-primary-900/20 transition-[outline] duration-100 rounded",
        keyboardKey === "backspace" ||
          keyboardKey === "enter" ||
          keyboardKey === "pro"
          ? "text-xs"
          : "text-lg",
        status === "CORRECT"
          ? "bg-green-600 text-white"
          : status === "WRONG_POSITION"
            ? "bg-orange-600 text-white"
            : status === "INCORRECT"
              ? "bg-primary-950/40 text-white"
              : keyboardKey === "enter"
                ? "bg-primary-500 text-white"
                : keyboardKey === "backspace" || keyboardKey === "pro"
                  ? "bg-white"
                  : "bg-primary-950/5",
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => e.preventDefault()}
    >
      {keyboardKey === "backspace" ? (
        <div className="size-5">
          <BackspaceIcon />
        </div>
      ) : (
        keyboardKey.toUpperCase()
      )}
    </button>
  );
}

function KeyWrapper({
  children,
  className,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "px-[1px]" : "px-0.5"} ${className}`}>
      {children}
    </div>
  );
}

function Spacer() {
  return <div className="flex-[0.5_1_0%]" />;
}

type GamePlayMode = "normal" | "pro";

function GameKeyboard({
  game,
  onKeyPress,
  onSubmit,
  mode = "normal",
}: {
  game?: ClientGame;
  onKeyPress: (key: string) => void;
  onSubmit: () => void;
  mode?: GamePlayMode;
}) {
  const compact = mode === "pro";
  return (
    <div className="flex flex-col items-center w-full gap-1.5">
      {KEYS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex w-full">
          {rowIndex === KEYS.length - 1 && (
            <KeyWrapper className="flex-[1.5_1_0%]">
              {!compact && (
                <GameKeyboardKey keyboardKey="enter" onPress={onSubmit} />
              )}
            </KeyWrapper>
          )}
          {rowIndex === 1 && <Spacer />}
          {row.map((key) => (
            <KeyWrapper className="flex-[1_1_0%]" key={key} compact={compact}>
              <GameKeyboardKey
                keyboardKey={key}
                status={game?.allGuessedCharacters[key]?.status}
                onPress={onKeyPress}
                compact={compact}
              />
            </KeyWrapper>
          ))}
          {rowIndex === KEYS.length - 1 && (
            <KeyWrapper className="flex-[1.5_1_0%]">
              {!compact && (
                <GameKeyboardKey keyboardKey="backspace" onPress={onKeyPress} />
              )}
            </KeyWrapper>
          )}
          {rowIndex === 1 && <Spacer />}
        </div>
      ))}
    </div>
  );
}

function getValidationResultMessage(
  validationResult: GuessValidationStatus | null,
) {
  switch (validationResult) {
    case "INVALID_EMPTY":
      return "Empty guess";
    case "INVALID_SIZE":
      return "Guess must be 5 letters";
    case "INVALID_FORMAT":
      return "Guess must be all letters";
    case "INVALID_WORD":
      return "Not a valid word";
    case "INVALID_ALREADY_GUESSED":
      return "Already guessed";
    case "INVALID_HARD_MODE":
      return "You have to use hard mode";
    default:
      return "";
  }
}

const placeholderGuesses = ["JUST ", "START", "TYPIN", "G... "].map((w) => ({
  characters: w
    .split("")
    .map((c) => ({ character: c, status: "UNKNOWN" as const })),
}));

interface WordCharacter {
  count: number;
  positions: Record<number, boolean>;
}

// TODO this is repeated functionality
function toWordCharacters(word: string): Record<string, WordCharacter> {
  return word.split("").reduce(
    (acc, c, idx) => {
      if (!acc[c]) {
        acc[c] = { count: 0, positions: {} };
      }
      acc[c]!.count++;
      acc[c]!.positions[idx] = true;
      return acc;
    },
    {} as Record<string, WordCharacter>,
  );
}

function toGuessCharacters(
  wordCharacters: Record<string, WordCharacter>,
  guess: string,
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

function GameGrid({
  game,
  currentWord,
  submitting,
  compact,
}: {
  game?: ClientGame;
  currentWord: string;
  submitting: boolean;
  compact?: boolean;
}) {
  const guesses = [...(game?.guesses || [])];
  if (currentWord) {
    if (game?.customMaker?.isArt) {
      const wordCharacters = toWordCharacters(game.customMaker.word!);
      const characters = toGuessCharacters(wordCharacters, currentWord);
      guesses.push({
        characters: Array.from({ length: 5 }).map(
          (_, idx) =>
            characters[idx] || {
              character: currentWord[idx] || "",
              status: "UNKNOWN" as const,
            },
        ),
      });
    } else {
      guesses.push({
        characters: Array.from({ length: 5 }).map((_, idx) => ({
          character: currentWord[idx] || "",
          status: "UNKNOWN" as const,
        })),
      });
    }
  }
  return (
    <GameGuessGrid
      guesses={guesses.length > 0 ? guesses : placeholderGuesses}
      placeholder={guesses.length === 0}
      full
      submitting={submitting}
      compact={compact}
    />
  );
}

function ArenaProgressIndicator({ game }: { game: ClientGame }) {
  const words = game.arena?.config.wordCount;
  const wordIndex = game.arenaWordIndex;
  if (!words || wordIndex == null) {
    return null;
  }

  return (
    <div className="flex flex-row gap-1 mt-1">
      {Array.from({ length: words }).map((_, idx) => (
        <div
          key={idx}
          className={clsx({
            "h-2 rounded flex-1": true,
            "bg-green-600":
              idx < wordIndex || (idx === wordIndex && game.completedAt),
            "bg-orange-600": idx === wordIndex && !game.completedAt,
            "bg-primary-950/20": idx > wordIndex,
          })}
        />
      ))}
    </div>
  );
}

export interface GameProps {
  game?: ClientGame;
  userData?: UserData & { fid?: number };
  appFrame?: boolean;
  error?: {
    error: string;
    type?: string;
  };
  onShare?: ({
    title,
    text,
    url,
  }: {
    title: string;
    text: string;
    url: string;
  }) => Promise<void>;
  onGameOver?: (game: ClientGame) => void;
  gameType: string;
  userChip?: React.ReactNode;
}

export function Game({
  game,
  error,
  userData,
  appFrame,
  userChip,
  onShare,
  gameType,
  onGameOver,
}: GameProps) {
  const [currentWord, setCurrentWord] = useState("");
  const [textInputWord, setTextInputWord] = useState("");
  const [currentGame, setCurrentGame] = useState(game);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [validationResult, setValidationResult] =
  //   useState<GuessValidationStatus | null>(null);
  const setValidationResult = useCallback(
    (result: GuessValidationStatus | null) => {
      if (result) {
        toast(getValidationResultMessage(result));
      }
    },
    [],
  );
  const isGameOver =
    currentGame?.status === "WON" || currentGame?.status === "LOST";
  const isArena = !!currentGame?.arena;
  const isCustom = !!currentGame?.isCustom;
  const isArt = !!currentGame?.customMaker?.isArt;
  const [isDialogOpen, setIsDialogOpen] = useState(isGameOver);
  const [mode, setMode] = useLocalStorage<GamePlayMode>("inputMode", "normal");
  const router = useRouter();

  const [isWindowFocused, setIsWindowFocused] = useState(
    document.hasFocus() || !window.matchMedia("(hover: hover)").matches,
  );
  const { status: sessionStatus } = useSession();
  const { jwt } = useJwt();
  const { sessionId } = useSessionId();
  const config = useAppConfig();
  const { impact, notification } = useHaptics();

  useEffect(() => {
    const onFocus = () => setIsWindowFocused(true);
    const onBlur = () => setIsWindowFocused(false);

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const handleGameChange = useCallback(
    (game: ClientGame | undefined) => {
      setCurrentGame(game);
      setCurrentWord("");
      setTextInputWord("");
      setValidationResult(null);
      setIsDialogOpen(game?.status === "WON" || game?.status === "LOST");
    },
    [
      setCurrentGame,
      setCurrentWord,
      setTextInputWord,
      setIsDialogOpen,
      setValidationResult,
    ],
  );

  useEffect(() => {
    handleGameChange(game);
  }, [game, handleGameChange]);

  const arenaId = currentGame?.arena?.id;
  const apiPath = arenaId ? `/api/arenas/${arenaId}/play` : "/api/games/play";
  const userId = userData?.fid?.toString() || sessionId;
  const identityProvider =
    appFrame && sessionStatus !== "authenticated"
      ? userData
        ? "fc_unauth"
        : "anon"
      : undefined;

  const anonUserInfo: BaseUserRequest = useMemo(() => {
    return {
      userId,
      identityProvider,
      userData: userData,
    };
  }, [userId, identityProvider, userData]);

  useEffect(() => {
    if (isGameOver && !isSubmitting) {
      notification("success");
    }
  }, [isGameOver, notification, isSubmitting]);

  const handleSubmit = useCallback(async () => {
    impact("light");
    if (mode === "pro") {
      inputRef.current?.focus();
    }
    if (isSubmitting) {
      return;
    }
    if (isGameOver) {
      setIsDialogOpen(true);
      return;
    }

    if (!currentWord) {
      setValidationResult("INVALID_EMPTY");
      return;
    }
    if (currentWord.length !== 5) {
      setValidationResult("INVALID_SIZE");
      return;
    }
    if (!/^[A-Za-z]{5}$/.test(currentWord.trim())) {
      setValidationResult("INVALID_FORMAT");
      return;
    }
    setIsSubmitting(true);
    try {
      const resp = await fetch(apiPath, {
        method: "POST",
        body: JSON.stringify({
          guess: currentWord,
          gameId: currentGame?.id,
          gameKey: currentGame?.gameKey,
          gameType,
          ...anonUserInfo,
        }),
        headers: jwt
          ? {
              Authorization: `Bearer ${jwt}`,
            }
          : {},
      });
      const data = await resp.json();
      if (data.data) {
        handleGameChange(data.data);
      }
      if (data.validationResult) {
        setValidationResult(data.validationResult);
      } else if (data.error) {
        toast(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    mode,
    currentWord,
    currentGame,
    isSubmitting,
    isGameOver,
    jwt,
    anonUserInfo,
    impact,
    setIsDialogOpen,
    setValidationResult,
    handleGameChange,
  ]);

  const handleKeyPress = useCallback(
    (k: string) => {
      // impact("light");
      if (isSubmitting || isGameOver) {
        return;
      }
      const key = k.toLowerCase();
      // only allow backspace and letters
      const isBackspace = key === "backspace";
      if (isBackspace) {
        setCurrentWord((word) => word.slice(0, -1));
        return;
      }
      const isLetter = /^[a-z]$/.test(key);
      if (isLetter) {
        setCurrentWord((word) => {
          const newWord = word + key;
          if (newWord.length > 5) {
            return word;
          }
          return newWord;
        });
      }
    },
    [setCurrentWord, isSubmitting, isGameOver],
  );

  useEffect(() => {
    if (isGameOver) {
      onGameOver?.(currentGame);
    }
  }, [isGameOver, currentGame, onGameOver]);

  const handleNewGame = useCallback(
    async (gt: "practice" | "daily" | "arena") => {
      if (gt !== "arena") {
        router.push(`/app/v2?gt=${gt}&ts=${Date.now()}`);
        return;
      }
      const resp = await fetch(apiPath, {
        method: "POST",
        body: JSON.stringify({
          ...anonUserInfo,
          gameType: gt,
        }),
        headers: jwt
          ? {
              Authorization: `Bearer ${jwt}`,
            }
          : {},
      });
      const data = await resp.json();
      if (data.data) {
        handleGameChange(data.data);
      }
    },
    [handleGameChange, jwt, anonUserInfo],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "enter") {
        handleSubmit();
      } else {
        handleKeyPress(key);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress, handleSubmit]);

  const handleShare = async (e: React.MouseEvent | KeyboardEvent) => {
    e.preventDefault();

    const { title, text } = buildShareableResult(currentGame, config);
    const url = `${config.externalBaseUrl}${appFrame ? "/app/v2" : "/"}?id=${
      currentGame?.id
    }&app=1`;
    const fullText = `${title}\n\n${text}`;
    if (onShare) {
      await onShare({ title, text, url });
    } else if (jwt) {
      const cast = { text: fullText, embeds: [url] };
      createCast(window, cast);
    } else {
      window.open(createComposeUrl(fullText, url), "_blank");
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (mode !== "pro") {
        return;
      }
      const viewHeight = window.visualViewport?.height ?? window.innerHeight;
      const scrollY = window.scrollY;
      const inputBottom =
        scrollY + (inputRef.current?.getBoundingClientRect().bottom ?? 0);
      const newScrollY = Math.max(0, inputBottom - viewHeight + 10);
      window.scroll({ top: newScrollY, behavior: "instant" });
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [mode]);

  const replacedScore = currentGame?.metadata?.replacedScore;
  const basicStats = currentGame?.metadata?.basicStats;
  const statsLoaded = basicStats != null;
  const completedCount =
    (basicStats?.totalLosses ?? 0) + (basicStats?.totalWins ?? 0);
  const isFreshGame = currentGame?.guessCount === 0;
  const isCompleted = currentGame?.completedAt != null;
  const isDaily = currentGame?.isDaily;

  const [isIntroOpen, setIsIntroOpen] = useState(false);

  useEffect(() => {
    if (
      replacedScore != null &&
      completedCount > 13 &&
      isDaily &&
      !isCompleted
    ) {
      toast(`Win in ${replacedScore} to keep your average`);
    }
  }, [replacedScore, completedCount, isDaily, isCompleted]);

  useEffect(() => {
    if (completedCount === 0 && statsLoaded && isFreshGame && isDaily) {
      setIsIntroOpen(true);
    }
  }, [completedCount, statsLoaded, isFreshGame, isDaily]);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
  }, [setIsDialogOpen]);

  const handleIntroOpen = useCallback(() => {
    setIsIntroOpen(true);
  }, [setIsIntroOpen]);

  const handleIntroClose = useCallback(() => {
    setIsIntroOpen(false);
  }, [setIsIntroOpen]);

  if (
    config.isPro &&
    ((currentGame && !currentGame.userData?.passOwnership) ||
      error?.type === "pass_required")
  ) {
    return <ProPassRequiredScreen />;
  }
  if (error && error.type !== "pass_required") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full w-full gap-4 p-4 relative">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center">
            <span className="text-xl font-semibold text-primary-900/50">
              An error ocurred: {error.error}
            </span>
            <br />
            <span className="text-primary-900/30">
              Sorry for the inconvenience
            </span>
          </div>
        </div>
        <Button
          variant="primary"
          href={`/app/v2?gt=${gameType}&ts=${Date.now()}`}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full w-full pt-2 gap-2 min-[360px]:gap-4 min-[360px]:pt-4 min-[360px]:pb-1 max-h-[960px] relative">
      {!isWindowFocused && !isGameOver && !isSubmitting && !isDialogOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-white/50 backdrop-blur-sm z-[10000]">
          <div className="flex items-center justify-center h-full w-full p-8">
            <div className="text-xl font-semibold text-primary-900/30">
              Click anywhere to start…
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-row items-center justify-between w-full px-4 sm:px-8 sm:py-4">
        <div>
          <div className="text-lg min-[360px]:text-xl font-semibold font-space flex items-center flex-wrap whitespace-pre-wrap">
            <span>Framedl </span>
            {config.isPro && <span style={{ color: "green" }}>PRO </span>}
            {isArena && <span>⚔️ ARENA</span>}
            {isArt && <span>🎨 ART</span>}
            {!isArena && !isArt && currentGame && (
              <span>{formatGameKey(currentGame)}</span>
            )}
          </div>
          {isArena ? (
            <ArenaProgressIndicator game={currentGame} />
          ) : isArt ? (
            <div className="text-xs min-[360px]:text-sm text-primary-900/50">
              Draw with the word{" "}
              <span className="font-semibold">
                {currentGame?.customMaker?.word?.toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="text-xs min-[360px]:text-sm text-primary-900/50">
              Guess the word
            </div>
          )}
        </div>
        {userChip
          ? userChip
          : (!appFrame || sessionStatus === "authenticated") && <SignIn />}
      </div>
      <div
        className={`relative flex-1 flex flex-col items-center w-full max-w-xl ${
          mode === "pro" ? "justify-start" : "justify-center"
        }`}
      >
        <div className="flex flex-row gap-4 w-full px-4 items-center justify-center">
          <GameGrid
            game={currentGame}
            currentWord={currentWord}
            submitting={isSubmitting}
            compact={mode === "pro"}
          />
          {mode === "pro" && (
            <div className="flex-1">
              <GameKeyboard
                game={currentGame}
                onKeyPress={() => {}}
                onSubmit={() => {}}
                mode={mode}
              />
            </div>
          )}
        </div>
        {mode === "pro" && (
          <div className="w-full flex gap-2 px-4 py-2 relative">
            <div className="absolute -top-12 right-4">
              <GameOptionsMenu
                onNewGame={handleNewGame}
                mode={mode}
                onModeChange={setMode}
                showDaily={!currentGame?.isDaily}
                isAppFrame={appFrame}
              />
            </div>
            <input
              ref={inputRef}
              placeholder="Make a guess…"
              type="text"
              className="flex-1 h-12 border border-primary-400 active:border-primary-500 focus:outline-primary-500 rounded-md px-3"
              autoFocus
              disabled={!currentGame || isGameOver}
              onChange={(e) => {
                const word = e.target.value;
                setTextInputWord(word);
                setCurrentWord(word.toLowerCase().substring(0, 5));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              value={textInputWord}
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              ENTER
            </Button>
          </div>
        )}
      </div>
      <GameCompletedDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onShare={handleShare}
        onNewGame={handleNewGame}
        game={currentGame}
        isAppFrame={appFrame}
        anonUserInfo={anonUserInfo}
      />
      <GameIntroDialog isOpen={isIntroOpen} onClose={handleIntroClose} />
      {mode === "normal" && (
        <div className="w-[640px] max-w-full p-0.5 relative">
          <div className="absolute -top-12 right-4">
            <GameOptionsMenu
              onNewGame={handleNewGame}
              showDaily={!currentGame?.isDaily}
              isAppFrame={appFrame}
              mode={mode}
              onModeChange={setMode}
              onIntroOpen={handleIntroOpen}
            />
          </div>
          <GameKeyboard
            game={currentGame}
            onKeyPress={handleKeyPress}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </div>
  );
}
