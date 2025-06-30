"use client";

import { useCallback, useState } from "react";
import { toast } from "../toasts/toast";
import { BaseUserRequest } from "@/app/api/api-utils";
import { GameStatus, MintMetadata } from "@/app/db/pg/types";
import { MintButton } from "../mint-button";
import { Button } from "../button/button";
import { AnimatePresence, motion } from "framer-motion";
import { Switch } from "@headlessui/react";
import { useLocalStorage } from "@/app/hooks/use-local-storage";

const MINT_PRICE = process.env.NEXT_PUBLIC_GAME_NFT_MINT_PRICE || "0.0004";
const ERC20_TOKEN_CONFIG = process.env.NEXT_PUBLIC_GAME_NFT_ERC20_TOKEN_CONFIG;
// const ERC20_TOKEN_CONFIG =
//   process.env.NEXT_PUBLIC_GAME_NFT_ERC20_TOKEN_CONFIG ||
//   '{ "address": "0x4ed4e862860bed51a9570b96d89af5e1b0efefed", "decimals": 18, "name": "DEGEN", "symbol": "DEGEN", "price": "50" }';

function safeParseJson<T>(json?: string | undefined | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

const erc20MintingTokenConfig = safeParseJson<{
  address: `0x${string}`;
  decimals: number;
  name: string;
  symbol: string;
  price: string;
}>(ERC20_TOKEN_CONFIG);

interface GameMintDialogContentProps {
  game: { id: string; status: GameStatus };
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
    body: JSON.stringify({
      hash,
      chainId,
      tokenId,
      walletAddress,
      ...anonUserInfo,
    }),
  });
  return await response.json();
}

function SwitchElement({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`text-center text-sm flex-1 z-10 delay-50 transition-all duration-200 ${
        active ? "text-primary-900/80 font-semibold" : "text-primary-900/50"
      }`}
    >
      {children}
    </span>
  );
}

export function GameMintDialogContent({
  game,
  onMint,
  onSkip,
  anonUserInfo,
}: GameMintDialogContentProps) {
  const gameId = game.id;
  const [erc20MintingEnabled, setErc20MintingEnabled] = useLocalStorage(
    `erc20MintingEnabled/${erc20MintingTokenConfig?.address ?? "default"}`,
    !!erc20MintingTokenConfig
  );
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
    toast("Collecting failed (" + error + ")");
  }, []);
  return (
    <div className="max-w-sm w-full flex flex-col items-center gap-4">
      <div className="w-full flex flex-col items-center py-4">
        <NFTPreview src={`/api/nfts/games/${game.id}/image?preview=true`} />
      </div>
      <div className="w-full flex flex-col gap-2">
        <h2 className="w-full text-center text-xl font-space font-bold">
          {game.status === "WON"
            ? "Collect your achievement!"
            : "You'll get 'em next time!"}
        </h2>
        <p className="w-full text-center text-primary-900/50 leading-snug">
          {game.status === "WON"
            ? "Immortalize your victory with a Framedl NFT — because screenshots are so 2022"
            : "Turn this defeat into digital art — because every plot twist deserves its own NFT"}
        </p>
      </div>
      <div className="flex flex-col gap-2 items-center w-full pt-4">
        {erc20MintingTokenConfig && erc20MintingEnabled ? (
          <MintButton
            gameId={game.id}
            onMintStarted={handleMintStarted}
            onMint={handleMint}
            onError={handleMintError}
            erc20Token={erc20MintingTokenConfig}
          />
        ) : (
          <MintButton
            gameId={game.id}
            onMintStarted={handleMintStarted}
            onMint={handleMint}
            onError={handleMintError}
          />
        )}
        {onSkip && (
          <Button variant="outline" size="sm" onClick={onSkip}>
            Skip
          </Button>
        )}
        {erc20MintingTokenConfig && (
          <Switch
            checked={erc20MintingEnabled}
            onChange={setErc20MintingEnabled}
            className="relative flex h-10 w-full items-center rounded-full bg-primary-500/5 mt-2"
          >
            <div
              className={`h-10 p-1 w-[50%] rounded-full absolute transition-all duration-200 ${
                erc20MintingEnabled ? "left-0" : "left-[50%]"
              }`}
            >
              <div
                className={
                  "w-full h-8 rounded-full bg-white border border-primary-500/20 shadow-sm shadow-primary-500/10"
                }
              />
            </div>
            <SwitchElement active={erc20MintingEnabled}>
              {`Use ${erc20MintingTokenConfig?.symbol}`}
            </SwitchElement>
            <SwitchElement
              active={!erc20MintingEnabled}
            >{`Use ETH`}</SwitchElement>
          </Switch>
        )}
        {erc20MintingTokenConfig && erc20MintingEnabled ? (
          <span className="text-center text-primary-900/50 text-xs">
            {`Collecting costs ${erc20MintingTokenConfig.price} \$${erc20MintingTokenConfig.symbol}`}
          </span>
        ) : (
          <span className="text-center text-primary-900/50 text-xs">
            {`Collecting costs ${MINT_PRICE}Ξ`}
          </span>
        )}
      </div>
    </div>
  );
}
