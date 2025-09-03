"use client";

import Loading from "@/app/app/loading";
import { useClientContext } from "@/app/app/v2/use-client-context";
import { ClientGame } from "@/app/game/game-service";
import { PublicArenaWithGames } from "@/app/games/arena/arena-utils";
import { useFarcasterSession } from "@/app/hooks/use-farcaster-session";
import { useEffect, useState } from "react";
import { PaddedContainer } from "@/app/ui/padded-container";
import { SignIn } from "@/app/ui/auth/sign-in";
import { Game } from "@/app/ui/game";
import { toast } from "@/app/ui/toasts/toast";

import { Button } from "@/app/ui/button/button";
export function ArenaPlayMiniApp({ arena }: { arena?: PublicArenaWithGames }) {
  const clientContext = useClientContext({});
  const { status } = useFarcasterSession();

  const [game, setGame] = useState<ClientGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (arena && !game && status === "authenticated") {
      setLoading(true);
      fetch(`/api/arenas/${arena.id}/play`, {
        method: "POST",
        body: JSON.stringify({}),
      })
        .then((res) => res.json())
        .then((data) => {
          if ("error" in data) {
            setErrorMessage(data.error);
          } else {
            setGame(data.data);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [arena, game, status]);

  if (status === "loading" || loading) {
    return <Loading />;
  }

  return (
    <PaddedContainer
      className="w-full h-full flex-1 flex flex-col items-center justify-center"
      context={clientContext}
      sides="trbl"
    >
      {arena ? (
        status === "authenticated" ? (
          <div className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center">
            {errorMessage ? (
              <div className="flex flex-col gap-4 max-w-sm">
                <div className="text-center text-primary-900/50">
                  {errorMessage}
                </div>
                <Button variant="outline" href={`/app/arena/${arena.id}/join`}>
                  Back
                </Button>
              </div>
            ) : (
              game && (
                <Game
                  appFrame
                  gameType="arena"
                  onShare={clientContext.share}
                  userChip={<SignIn />}
                  game={game}
                />
              )
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 items-center justify-center text-center text-primary-900/30">
            <span className="text-5xl font-semibold hover:rotate-90 transition-transform duration-300">
              {":("}
            </span>
            <span className="text-lg font-semibold">Not signed in</span>
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col gap-4 items-center justify-center text-center text-primary-900/30">
          <span className="text-5xl font-semibold hover:rotate-90 transition-transform duration-300">
            {":("}
          </span>
          <span className="text-lg font-semibold">Arena not found</span>
        </div>
      )}
    </PaddedContainer>
  );
}
