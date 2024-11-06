"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Guess,
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
import { externalBaseUrl } from "../constants";
import { createCast } from "../lib/cast";
import Dialog from "./dialog";
import { Avatar } from "./avatar";

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
  onClick,
  status,
}: {
  keyboardKey: string;
  onClick: () => void;
  status?: GuessCharacter["status"];
}) {
  return (
    <button
      className={`w-full h-12 font-semibold flex items-center justify-center select-none active:outline active:outline-2 active:outline-primary-900/20 transition-all duration-100 rounded ${
        keyboardKey === "backspace" || keyboardKey === "enter"
          ? "text-xs"
          : "text-lg"
      } ${
        status === "CORRECT"
          ? "bg-green-600 text-white"
          : status === "WRONG_POSITION"
          ? "bg-orange-600 text-white"
          : status === "INCORRECT"
          ? "bg-primary-950/40 text-white"
          : "bg-primary-950/5"
      }`}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
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

function GameKeyboard({
  game,
  onKeyPress,
}: {
  game?: GuessedGame;
  onKeyPress: (key: string) => void;
}) {
  function Spacer() {
    return <div className="flex-[0.5_1_0%]" />;
  }
  function KeyWrapper({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return <div className={`px-0.5 ${className}`}>{children}</div>;
  }
  return (
    <div className="flex flex-col gap-1.5 items-center w-full">
      {KEYS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex w-full">
          {rowIndex === KEYS.length - 1 && (
            <KeyWrapper className="flex-[1.5_1_0%]">
              <GameKeyboardKey
                keyboardKey="enter"
                onClick={() => onKeyPress("enter")}
              />
            </KeyWrapper>
          )}
          {rowIndex === 1 && <Spacer />}
          {row.map((key) => (
            <KeyWrapper className="flex-1" key={key}>
              <GameKeyboardKey
                keyboardKey={key}
                status={game?.allGuessedCharacters[key]?.status}
                onClick={() => onKeyPress(key)}
              />
            </KeyWrapper>
          ))}
          {rowIndex === KEYS.length - 1 && (
            <KeyWrapper className="flex-[1.5_1_0%]">
              <GameKeyboardKey
                keyboardKey="backspace"
                onClick={() => onKeyPress("backspace")}
              />
            </KeyWrapper>
          )}
          {rowIndex === 1 && <Spacer />}
        </div>
      ))}
    </div>
  );
}

function GameWord({
  word,
}: {
  word?: Omit<Guess, "characters"> & {
    characters: (GuessCharacter & { character: string })[];
  };
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 5 }).map((_, idx) => {
        const character = word?.characters[idx];
        return (
          <div
            key={idx}
            className={
              "w-16 h-16 bg-white font-semibold flex items-center justify-center text-2xl"
            }
          >
            {character?.character?.toUpperCase()}
          </div>
        );
      })}
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

function GameGrid({
  game,
  currentWord,
  submitting,
}: {
  game?: GuessedGame;
  currentWord: string;
  submitting: boolean;
}) {
  const guesses = [...(game?.guesses || [])];
  guesses.push({
    characters: Array.from({ length: 5 }).map((_, idx) => ({
      character: currentWord[idx] || "",
      status: "UNKNOWN" as const,
    })),
  });
  return <GameGuessGrid guesses={guesses} full submitting={submitting} />;
  // return (
  //   <div className="flex flex-col gap-2 items-center">
  //     {game?.guesses.map((guess, index) => (
  //       <GameWord key={index} word={guess} />
  //     ))}
  //     <GameWord
  //       word={{
  //         characters: currentWord
  //           .split("")
  //           .map((c) => ({ character: c, status: "CORRECT" as const })),
  //       }}
  //     />
  //   </div>
  // );
}

interface GameProps {
  game?: GuessedGame;
  jwt?: string;
  userData?: {
    profileImage?: string | null;
    displayName?: string | null;
    username?: string | null;
  };
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

function getGameHref(game: GuessedGame, jwt?: string) {
  const url = new URL(`${externalBaseUrl}/app`);
  url.searchParams.set("id", game.id);
  if (jwt) {
    url.searchParams.set("jwt", jwt);
  }
  return url.toString();
}

export function Game({ game, jwt, userData }: GameProps) {
  const [currentWord, setCurrentWord] = useState("");
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

  const submit = async () => {
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
        }),
        headers: jwt
          ? {
              Authorization: `Bearer ${jwt}`,
            }
          : {},
      });
      const data = await resp.json();
      if (data.data) {
        setCurrentGame(data.data);
        setCurrentWord("");
        setValidationResult(null);
        if (data.data.status === "WON" || data.data.status === "LOST") {
          setIsDialogOpen(true);
        }
      }
      if (data.validationResult) {
        setValidationResult(data.validationResult);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = useCallback(
    (k: string) => {
      const key = k.toLowerCase();
      const isEnter = key === "enter";
      if (isSubmitting || isGameOver) {
        if (isEnter && isGameOver) {
          setIsDialogOpen(true);
        }
        return;
      }
      if (isEnter) {
        submit();
        return;
      }
      // only allow backspace, enter, and letters
      const isBackspace = key === "backspace";
      if (isBackspace) {
        setCurrentWord(currentWord.slice(0, -1));
        return;
      }
      const isLetter = /^[a-z]$/.test(key);
      if (isLetter) {
        const newWord = currentWord + key;
        if (newWord.length > 5) {
          return;
        }
        setCurrentWord(newWord);
      }
    },
    [currentWord, setCurrentWord, isSubmitting, isGameOver]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      handleKeyPress(e.key.toLowerCase());
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

  const handleShare = () => {
    const { title, text } = buildShareableResult(currentGame);
    const url = `${externalBaseUrl}/?id=${currentGame?.id}&app=1`;
    createCast({ text: `${title}\n\n${text}`, embeds: [url] });
  };

  const handlePractice = () => {
    setCurrentGame(undefined);
    setIsDialogOpen(false);
    setCurrentWord("");
  };

  return (
    <div className="flex flex-col gap-4 items-center h-full w-full pt-4 pb-1.5   px-0.5 max-h-[720px]">
      <div className="flex flex-row items-center justify-between gap-2 w-full px-3.5">
        <div>
          <div className="text-xl font-semibold font-space">
            Framedl {currentGame && formatGameKey(currentGame)}
          </div>
          <div className="text-sm text-primary-900/50">Guess the word</div>
        </div>
        {userData && (
          <div className="flex items-center gap-2 p-1 rounded-full bg-white">
            <Avatar
              avatar={userData.profileImage}
              username={userData.username}
            />
            <div className="text-sm text-primary-900/50 pr-3">
              {`@${userData.username}`}
            </div>
          </div>
        )}
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center w-full">
        <GameGrid
          game={currentGame}
          currentWord={currentWord}
          submitting={isSubmitting}
        />
        <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">
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
          {currentGame && (
            <div className="flex flex-col gap-2 items-center w-full pt-4">
              <Button variant="primary" onClick={handleShare}>
                Share
              </Button>
              {isPracticeGame(currentGame) ? (
                <Button variant="outline" onClick={handlePractice} size="sm">
                  New Practice
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  href={`/app/leaderboard?uid=${
                    currentGame.userId
                  }&gh=${encodeURIComponent(getGameHref(currentGame, jwt))}`}
                >
                  Leaderboard
                </Button>
              )}
              {currentGame.isDaily && <NextGameMessage />}
            </div>
          )}
          {currentGame?.status === "WON" && <GameConfetti />}
        </div>
      </Dialog>
      <div className="w-96 max-w-full">
        <GameKeyboard game={currentGame} onKeyPress={handleKeyPress} />
      </div>
    </div>
  );
}
