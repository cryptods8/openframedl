"use client";

import { useCallback, useState } from "react";
import { toast } from "../toasts/toast";
import { BaseUserRequest } from "@/app/api/api-utils";
import { GameStatus, MintMetadata } from "@/app/db/pg/types";
import { MintButton } from "../mint-button";
import { Button } from "../button/button";
import { AnimatePresence, motion } from "framer-motion";

const MINT_PRICE = process.env.NEXT_PUBLIC_GAME_NFT_MINT_PRICE || "0.0004";

interface GameMintDialogContentProps {
  game: { id: string, status: GameStatus };
  anonUserInfo?: BaseUserRequest;
  onMint: () => void;
  onSkip?: () => void;
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
        <AnimatePresence>
          {isImageLoading && (
            <motion.div 
              className="absolute inset-0 bg-white rounded-lg overflow-hidden"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-gray-300 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center p-4 text-gray-400">
                {"Generating preview..."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <img
          src={src}
          alt="NFT Preview"
          className="w-full h-full object-cover rounded-lg shadow-xl"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)"
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
  anonUserInfo: BaseUserRequest | undefined,
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

export function GameMintDialogContent({
  game,
  onMint,
  onSkip,
  anonUserInfo,
}: GameMintDialogContentProps) {
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
        <NFTPreview src={`/api/nfts/games/${game.id}/image?preview=true`} />
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
        {onSkip && (
          <Button variant="outline" size="sm" onClick={onSkip}>
            Skip
          </Button>
        )}
        <span className="text-center text-primary-900/50 text-xs">
          {`Minting costs ${MINT_PRICE}Ξ`}
        </span>
      </div>
    </div>
  );
}
