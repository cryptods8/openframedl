"use client";

import { useEffect, useState } from "react";
import { useAppConfig } from "../contexts/app-config-context";
import { GuessedGame } from "../game/game-service";
import { addDaysToDate, formatDurationSimple } from "../game/game-utils";
import { useJwt } from "../hooks/use-jwt";
import { Button } from "./button/button";
import { Dialog } from "./dialog";
import UserStats from "./game/user-stats";
import { useLocalStorage } from "../hooks/use-local-storage";
import { toast } from "./toasts/toast";
import { BaseUserRequest } from "../api/api-utils";
import { GameMintDialogContent } from "./game/game-mint-dialogue-content";
import { CorrectWordDisplay } from "./correct-word-display";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_NFT_CA;

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
    config: { externalBaseUrl: string };
    jwt?: string;
    isAppFrame?: boolean;
  }
) {
  const url = new URL(
    `${options.config.externalBaseUrl}/app${options.isAppFrame ? "/v2" : ""}`
  );
  url.searchParams.set("id", game.id);
  if (options.jwt) {
    url.searchParams.set("jwt", options.jwt);
  }
  return url.toString();
}

interface GameCompletedDialogProps {
  isOpen: boolean;
  isAppFrame?: boolean;
  game?: GuessedGame;
  anonUserInfo: BaseUserRequest;
  onClose: () => void;
  onShare: (e: React.MouseEvent) => void;
  onNewGame: (gameType: "practice") => void;
}

export function GameCompletedDialog({
  isOpen,
  isAppFrame,
  game,
  anonUserInfo,
  onClose,
  onShare,
  onNewGame,
}: GameCompletedDialogProps) {
  const { jwt } = useJwt();
  const config = useAppConfig();
  const [showMintOverlay, setShowMintOverlay] = useState(false);
  const [skippedGames, setSkippedGames] = useLocalStorage<
    Record<string, boolean>
  >("skippedGames", {});

  const isMinted = (game?.gameData?.mints?.length ?? 0) > 0;
  const isSkipped = skippedGames[game?.id ?? ""] ?? false;
  const canMint = !!CONTRACT_ADDRESS;

  useEffect(() => {
    if (isOpen && canMint && !isMinted && !isSkipped) {
      setShowMintOverlay(true);
    }
  }, [isOpen, canMint, isMinted, isSkipped]);

  const handleMint = () => {
    if (game) {
      setShowMintOverlay(false);
      toast("Collected ✨");
    }
  };

  const handleSkip = () => {
    if (game) {
      setSkippedGames((prev) => ({ ...prev, [game.id]: true }));
      setShowMintOverlay(false);
    }
  };

  const handleShowMintOverlay = () => {
    setShowMintOverlay(true);
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      {showMintOverlay && game ? (
        <div className="w-full">
          <GameMintDialogContent
            game={game}
            anonUserInfo={anonUserInfo}
            onMint={handleMint}
            onSkip={handleSkip}
          />
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <p className="w-full text-left text-xl font-space font-bold">
            {game?.status === "WON" ? "You won! 🎉" : "Better luck next time!"}
          </p>
          <p className="w-full text-left text-primary-900/50 leading-snug">
            {game?.status === "WON" ? (
              <span>
                You found the word{" "}
                {game?.word && (
                  <CorrectWordDisplay word={game.word} />
                )}
                {" "}in {game.guesses.length}
                {game.isHardMode ? "* " : " "}
                {game.guesses.length === 1 ? "attempt" : "attempts"}
              </span>
            ) : (
              <span>
                You ran out of guesses.{" "}
                {game?.word && (
                  <span>
                    <span>The correct word was </span>
                    <CorrectWordDisplay word={game.word} />
                  </span>
                )}
              </span>
            )}
          </p>
          {game?.isDaily && game.completedAt && (
            <div className="w-full pt-2">
              <UserStats game={game} />
            </div>
          )}
          {game && (
            <div className="flex flex-col gap-2 items-center w-full pt-4">
              <Button variant="primary" onClick={onShare}>
                Share
              </Button>
              {game && !isMinted && isSkipped && canMint && (
                <Button
                  variant="outline"
                  onClick={handleShowMintOverlay}
                  size="sm"
                >
                  Collect NFT
                </Button>
              )}
              {isPracticeGame(game) ? (
                <Button
                  variant="outline"
                  onClick={() => onNewGame("practice")}
                  size="sm"
                >
                  New Practice
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  href={`/app/leaderboard?uid=${
                    game.userId
                  }&gh=${encodeURIComponent(
                    getGameHref(game, { config, jwt, isAppFrame })
                  )}&ip=${game.identityProvider}`}
                >
                  Leaderboard
                </Button>
              )}
              {game.isDaily && <NextGameMessage />}
            </div>
          )}
          {/* disable confetti and see if the crash persists */}
          {/* {currentGame?.status === "WON" && <GameConfetti />} */}
        </div>
      )}
    </Dialog>
  );
}
