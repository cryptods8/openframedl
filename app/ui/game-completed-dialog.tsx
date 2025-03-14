"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppConfig } from "../contexts/app-config-context";
import { GuessedGame } from "../game/game-service";
import { addDaysToDate, formatDurationSimple } from "../game/game-utils";
import { useJwt } from "../hooks/use-jwt";
import { Button } from "./button/button";
import { Dialog } from "./dialog";
import UserStats from "./game/user-stats";
import { useLocalStorage } from "../hooks/use-local-storage";
import { MintButton } from "./mint-button";
import { toast } from "./toasts/toast";
import { MintMetadata } from "../db/pg/types";
import { BaseUserRequest } from "../api/api-utils";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_NFT_CA;
const MINT_PRICE = process.env.NEXT_PUBLIC_GAME_NFT_MINT_PRICE || "0.0004";

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

interface MintDialogContentProps {
  game: GuessedGame;
  anonUserInfo: BaseUserRequest;
  onMint: () => void;
  onSkip: () => void;
}

function NFTPreview({ src }: { src: string }) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const handleInteraction = useCallback(
    (x: number, y: number, rect: DOMRect) => {
      // Convert position to -1 to 1 range
      const normalizedX = ((y - rect.top) / rect.height) * 2 - 1;
      const normalizedY = ((x - rect.left) / rect.width) * 2 - 1;

      setRotation({
        x: normalizedX * -15,
        y: normalizedY * 15,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const element = e.currentTarget;
      const rect = element.getBoundingClientRect();
      handleInteraction(e.clientX, e.clientY, rect);
    },
    [handleInteraction]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent scrolling while touching
      const element = e.currentTarget;
      const rect = element.getBoundingClientRect();
      const touch = e.touches[0];
      if (touch) {
        handleInteraction(touch.clientX, touch.clientY, rect);
      }
    },
    [handleInteraction]
  );

  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  return (
    <div
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setRotation({ x: 0, y: 0 });
      }}
      onTouchMove={handleTouchMove}
      onTouchStart={() => setIsHovering(true)}
      onTouchEnd={() => {
        setIsHovering(false);
        setRotation({ x: 0, y: 0 });
      }}
    >
      <div
        className="w-64 h-64 transition-transform duration-200 ease-out"
        style={{
          transform: isHovering
            ? `perspective(1000px) scale(1.1) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
            : "perspective(1000px) scale(1) rotateX(0deg) rotateY(0deg)",
        }}
      >
        {isImageLoading && (
          <div className="absolute inset-0 bg-white rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gray-300 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center p-4 text-gray-400">
              {"Generating preview..."}
            </div>
          </div>
        )}
        <img
          src={src}
          alt="NFT Preview"
          className="w-full h-full object-cover rounded-lg shadow-xl"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)",
          }}
          onLoad={handleImageLoad}
        />
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: isHovering
              ? `radial-gradient(
                  circle at ${100 - ((rotation.y + 15) / 30) * 100}% ${
                  ((rotation.x + 15) / 30) * 100
                }%,
                  rgba(255,255,255,0.35) 0%,
                  rgba(255,255,255,0.12) 45%,
                  rgba(255,255,255,0) 80%
                )`
              : "none",
            transition: "background 0.2s ease-out",
          }}
        />
      </div>
    </div>
  );
}

async function postMint(
  gameId: string,
  anonUserInfo: BaseUserRequest,
  {
    hash,
    chainId,
    tokenId,
    walletAddress,
  }: Pick<MintMetadata, "hash" | "chainId" | "tokenId" | "walletAddress">
) {
  const response = await fetch(`/api/games/${gameId}/mints`, {
    method: "POST",
    body: JSON.stringify({ hash, chainId, tokenId, walletAddress, ...anonUserInfo }),
  });
  return await response.json();
}

function MintDialogContent({
  game,
  onMint,
  onSkip,
  anonUserInfo,
}: MintDialogContentProps) {
  const gameId = game.id;
  const handleMintStarted = useCallback(
    ({
      hash,
      chainId,
      walletAddress,
    }: Pick<MintMetadata, "hash" | "chainId" | "walletAddress">) => {
      postMint(gameId, anonUserInfo, { hash, chainId, walletAddress });
    },
    [gameId, anonUserInfo]
  );
  const handleMint = useCallback(
    ({
      hash,
      chainId,
      tokenId,
      walletAddress,
    }: Pick<
      MintMetadata,
      "hash" | "chainId" | "tokenId" | "walletAddress"
    >) => {
      postMint(gameId, anonUserInfo, { hash, chainId, tokenId, walletAddress });
      onMint();
    },
    [gameId, anonUserInfo, onMint]
  );
  const handleMintError = useCallback((error: string | undefined) => {
    console.error(error);
    toast("Minting failed (" + error + ")");
  }, []);
  return (
    <div className="max-w-sm w-full flex flex-col items-center gap-4">
      <div className="w-full flex flex-col items-center py-4">
        <NFTPreview src={`/api/nfts/games/${game.id}/image`} />
      </div>
      <div className="w-full flex flex-col gap-2">
        <h2 className="w-full text-center text-xl font-space font-bold">
          {game.status === "WON"
            ? "Mint your achievement!"
            : "You'll get 'em next time!"}
        </h2>
        <p className="w-full text-center text-primary-900/50 leading-snug">
          {game.status === "WON"
            ? "Immortalize your victory with a Framedl NFT — because screenshots are so 2022"
            : "Turn this defeat into digital art — because every plot twist deserves its own NFT"}
        </p>
      </div>
      <div className="flex flex-col gap-2 items-center w-full pt-4">
        <MintButton
          gameId={game.id}
          onMintStarted={handleMintStarted}
          onMint={handleMint}
          onError={handleMintError}
        />
        <Button variant="outline" size="sm" onClick={onSkip}>
          Skip
        </Button>
        <span className="text-center text-primary-900/50 text-xs">
          {`Minting costs ${MINT_PRICE}Ξ`}
        </span>
      </div>
    </div>
  );
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
      toast("Minted ✨");
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
          <MintDialogContent
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
                  <span className="font-bold">{game.word.toUpperCase()} </span>
                )}
                in {game.guesses.length}
                {game.isHardMode ? "* " : " "}
                {game.guesses.length === 1 ? "attempt" : "attempts"}
              </span>
            ) : (
              <span>
                You ran out of guesses.{" "}
                {game?.word && (
                  <span>
                    <span>The correct word was </span>
                    <span className="font-bold">{game.word.toUpperCase()}</span>
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
                  Mint NFT
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
