"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  GuessCharacter,
  GuessedGame,
  GuessValidationStatus,
} from "../game/game-service";
import { GameGuessGrid } from "./game-guess-grid";
import { Toast } from "./toast";
import { GameConfetti } from "./game-confetti";
import { Button } from "./button/button";
import {
  addDaysToDate,
  buildShareableResult,
  formatDurationSimple,
  formatGameKey,
} from "../game/game-utils";
import { createCast } from "../lib/cast";
import { Dialog } from "./dialog";
import { SignIn } from "./auth/sign-in";
import { createComposeUrl } from "../utils";
import { GameOptionsMenu } from "./game/game-options-menu";
import { useSession } from "next-auth/react";
import { useJwt } from "../hooks/use-jwt";
import { UserData } from "../game/game-repository";
import Image from "next/image";
import Link from "next/link";
import UserStats from "./game/user-stats";

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
    null
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
          : "bg-primary-950/5"
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
  game?: GuessedGame;
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
  validationResult: GuessValidationStatus | null
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
    default:
      return "";
  }
}

const placeholderGuesses = ["JUST ", "START", "TYPIN", "G... "].map((w) => ({
  characters: w
    .split("")
    .map((c) => ({ character: c, status: "UNKNOWN" as const })),
}));

function GameGrid({
  game,
  currentWord,
  submitting,
  compact,
}: {
  game?: GuessedGame;
  currentWord: string;
  submitting: boolean;
  compact?: boolean;
}) {
  const guesses = [...(game?.guesses || [])];
  if (currentWord) {
    guesses.push({
      characters: Array.from({ length: 5 }).map((_, idx) => ({
        character: currentWord[idx] || "",
        status: "UNKNOWN" as const,
      })),
    });
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

function NextGameMessage() {
  // calculate time until tomorrow 00UTC
  const now = new Date();
  const tomorrow = addDaysToDate(now, 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  return (
    <div className="text-sm text-primary-900/50">
      Next game starts in {formatDurationSimple(minutes)}
    </div>
  );
}

function isPracticeGame(game: GuessedGame) {
  return !game.isDaily && !game.isCustom && !game.arena;
}

function getGameHref(
  game: GuessedGame,
  options: {
    config: GameConfig;
    jwt?: string;
    appFrame?: boolean;
  }
) {
  const url = new URL(
    `${options.config.externalBaseUrl}/app${options.appFrame ? "/v2" : ""}`
  );
  url.searchParams.set("id", game.id);
  if (options.jwt) {
    url.searchParams.set("jwt", options.jwt);
  }
  return url.toString();
}

interface GameConfig {
  externalBaseUrl: string;
  isPro: boolean;
}

function useSessionId() {
  function generateId() {
    const id = Math.random().toString(36).substring(2);
    return id;
  }
  function getSessionId() {
    if (typeof localStorage !== "undefined") {
      const savedId = localStorage.getItem("game_sessionId");
      if (!savedId) {
        const id = generateId();
        localStorage.setItem("game_sessionId", id);
        return id;
      }
      return savedId;
    }
    return generateId();
  }
  return {
    sessionId: getSessionId(),
  };
}

export interface GameProps {
  game?: GuessedGame;
  config: GameConfig;
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
  onGameOver?: () => void;
  gameType?: string;
  userChip?: React.ReactNode;
}

export function Game({
  game,
  config,
  error,
  userData,
  appFrame,
  gameType,
  userChip,
  onShare,
  onGameOver,
}: GameProps) {
  const [currentWord, setCurrentWord] = useState("");
  const [textInputWord, setTextInputWord] = useState("");
  const [currentGame, setCurrentGame] = useState(game);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] =
    useState<GuessValidationStatus | null>(null);
  const [customToastMessage, setCustomToastMessage] = useState<string | null>(
    null
  );
  const isGameOver =
    currentGame?.status === "WON" || currentGame?.status === "LOST";
  const [isDialogOpen, setIsDialogOpen] = useState(isGameOver);
  const [mode, setMode] = useState<GamePlayMode>("normal");

  const [isWindowFocused, setIsWindowFocused] = useState(
    document.hasFocus() || !window.matchMedia("(hover: hover)").matches
  );
  const { status: sessionStatus } = useSession();
  const { jwt } = useJwt();
  const { sessionId } = useSessionId();

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
    (game: GuessedGame | undefined) => {
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
    ]
  );

  useEffect(() => {
    handleGameChange(game);
  }, [game, handleGameChange]);

  const handleSubmit = useCallback(async () => {
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
      const resp = await fetch("/api/games/play", {
        method: "POST",
        body: JSON.stringify({
          guess: currentWord,
          gameId: currentGame?.id,
          userData: appFrame ? userData : undefined,
          userId: userData?.fid?.toString() || sessionId,
          identityProvider:
            appFrame && sessionStatus !== "authenticated"
              ? userData
                ? "fc_unauth"
                : "anon"
              : undefined,
          gameType: appFrame ? gameType : undefined,
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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentWord,
    currentGame,
    isSubmitting,
    isGameOver,
    jwt,
    setIsDialogOpen,
    setValidationResult,
    setCurrentWord,
    handleGameChange,
  ]);

  const handleKeyPress = useCallback(
    (k: string) => {
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
    [setCurrentWord, isSubmitting, isGameOver]
  );

  useEffect(() => {
    if (isGameOver) {
      onGameOver?.();
    }
  }, [isGameOver, onGameOver]);

  const handleNewGame = useCallback(
    (gameType: "practice" | "daily") => {
      if (gameType === "practice") {
        handleGameChange(undefined);
      }
    },
    [handleGameChange]
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

  const handleShare = async (e: React.MouseEvent) => {
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

  const scrollToInput = useCallback(() => {
    if (inputRef.current) {
      const inputBottom = inputRef.current.getBoundingClientRect().bottom;
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const scrollOffset = inputBottom - viewportHeight + 12;
      setCustomToastMessage(
        `[${scrollOffset}, ${viewportHeight}, ${inputBottom}]`
      );
      setTimeout(() => window.scrollTo({ top: Math.max(scrollOffset, 0) }), 10);
    }
  }, [inputRef]);

  useEffect(() => {
    const handleResize = () => {
      setCustomToastMessage(`Resized: ${window.visualViewport?.height}`);
      // setTimeout(() => scrollToInput(), 10);
      // scrollToInput();
    };
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      setCustomToastMessage(`Removed resize listener`);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [scrollToInput]);

  if (
    config.isPro &&
    ((currentGame && !currentGame.userData?.passOwnership) ||
      error?.type === "pass_required")
  ) {
    return (
      <div className="flex flex-col h-full w-full p-8 items-center justify-center text-center gap-8">
        <Link
          href="https://zora.co/collect/base:0x402ae0eb018c623b14ad61268b786edd4ad87c56/1"
          target="_blank"
        >
          <div className="overflow-hidden rounded-md shadow-xl shadow-primary-500/5 max-w-xl hover:scale-105 transition-all duration-150 active:scale-100 active:shadow-primary-500/0">
            <Image
              src="/pro-full.png"
              alt="Framedl PRO"
              className="w-full aspect-square"
              width={2048}
              height={2048}
            />
          </div>
        </Link>
        <div>
          <p className="text-xl font-semibold text-primary-900/50">
            Framedl PRO Pass is required to play
          </p>
          <p className="text-primary-900/50 mt-2">
            Click on the image to go to Zora and buy the Framedl PRO Pass
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full w-full pt-2 gap-2 min-[360px]:gap-4 min-[360px]:pt-4 min-[360px]:pb-1 max-h-[960px] relative">
      {!isWindowFocused && !isGameOver && !isSubmitting && !isDialogOpen && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/50 backdrop-blur-sm z-[10000]">
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
            <span>{currentGame && formatGameKey(currentGame)}</span>
          </div>
          <div className="text-xs min-[360px]:text-sm text-primary-900/50">
            Guess the word
          </div>
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
              {customToastMessage}
            </div>
          )}
        </div>
        {/* <div className="flex flex-row gap-2 pt-4 w-full px-4">
          <div className="flex-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode("normal")}
            >
              Normal
            </Button>
          </div>
          <div className="flex-1">
            <Button size="sm" variant="outline" onClick={() => setMode("pro")}>
              Pro
            </Button>
          </div>
        </div> */}
        {mode === "pro" && (
          // <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-primary-100">
          <div className="w-full flex gap-2 px-4 py-2">
            <input
              ref={inputRef}
              placeholder="Make a guess…"
              type="text"
              className="flex-1 h-12 border border-primary-400 active:border-primary-500 focus:outline-primary-500 rounded-md px-3"
              autoFocus
              // onBlur={scrollToInput}
              // onFocus={scrollToInput}
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
              // disabled={isSubmitting}
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
            {/* </div> */}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 overflow-hidden py-4">
          <Toast
            message={getValidationResultMessage(validationResult)}
            isVisible={!!validationResult}
            onClose={() => setValidationResult(null)}
          />
          <Toast
            message={customToastMessage || ""}
            isVisible={!!customToastMessage}
            onClose={() => setCustomToastMessage(null)}
          />
        </div>
      </div>
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <div className="w-full flex flex-col gap-2">
          <p className="w-full text-left text-xl font-space font-bold">
            {currentGame?.status === "WON"
              ? "You won! 🎉"
              : "Better luck next time!"}
          </p>
          <p className="w-full text-left text-primary-900/50 leading-snug">
            {currentGame?.status === "WON" ? (
              <span>
                You found the word{" "}
                {currentGame?.word && (
                  <span className="font-bold">
                    {currentGame.word.toUpperCase()}{" "}
                  </span>
                )}
                in {currentGame.guesses.length}
                {currentGame.isHardMode ? "* " : " "}
                {currentGame.guesses.length === 1 ? "attempt" : "attempts"}
              </span>
            ) : (
              <span>
                You ran out of guesses.{" "}
                {currentGame?.word && (
                  <span>
                    <span>The correct word was </span>
                    <span className="font-bold">
                      {currentGame.word.toUpperCase()}
                    </span>
                  </span>
                )}
              </span>
            )}
          </p>
          {currentGame?.isDaily && currentGame.completedAt && (
            <div className="w-full pt-2">
              <UserStats game={currentGame} />
            </div>
          )}
          {currentGame && (
            <div className="flex flex-col gap-2 items-center w-full pt-4">
              <Button variant="primary" onClick={handleShare}>
                Share
              </Button>
              {isPracticeGame(currentGame) ? (
                <Button
                  variant="outline"
                  onClick={() => handleNewGame("practice")}
                  size="sm"
                >
                  New Practice
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  href={`/app/leaderboard?uid=${
                    currentGame.userId
                  }&gh=${encodeURIComponent(
                    getGameHref(currentGame, { config, jwt, appFrame })
                  )}&ip=${currentGame.identityProvider}`}
                >
                  Leaderboard
                </Button>
              )}
              {currentGame.isDaily && <NextGameMessage />}
            </div>
          )}
          {/* disable confetti and see if the crash persists */}
          {/* {currentGame?.status === "WON" && <GameConfetti />} */}
        </div>
      </Dialog>
      {mode === "normal" && (
        <div className="w-[640px] max-w-full p-0.5 relative">
          {!appFrame && (
            <div className="absolute -top-12 right-4">
              <GameOptionsMenu
                onNewGame={handleNewGame}
                showDaily={
                  sessionStatus === "authenticated" && !currentGame?.isDaily
                }
              />
            </div>
          )}
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
