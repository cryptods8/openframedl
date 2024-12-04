import { CustomGameMaker, GuessedGame } from "@/app/game/game-service";
import { formatUsername } from "@/app/game/game-utils";
import { isPro } from "@/app/constants";
import { lightColor, primaryColor } from "./image-utils";
import { OGBadge } from "./og-badge";

function formatGameKey(
  game: GuessedGame | undefined | null,
  customMaker: CustomGameMaker | undefined | null
) {
  if (!game && !customMaker) {
    return "";
  }
  const gameKey = game?.gameKey || "";
  if (customMaker) {
    const username = formatUsername(customMaker);
    return `#${customMaker?.number} by @${username}`;
  }
  if (game && !game.isDaily && gameKey) {
    return `Practice (${gameKey.substring(gameKey.length - 8)})`;
  }
  return gameKey;
}

export function GameTitle({
  game,
  customMaker,
  dark,
  type,
  size = "md",
}: {
  game?: GuessedGame | null | undefined;
  customMaker?: CustomGameMaker | null | undefined;
  dark?: boolean;
  type?: "ARENA" | "ART" | "DAILY" | "PRACTICE";
  size?: "sm" | "md" | "lg";
}) {
  const isArena = type === "ARENA";
  return (
    <div
      tw={`flex items-center flex-wrap ${
        size === "lg" ? "text-6xl" : size === "md" ? "text-5xl" : "text-4xl"
      }`}
      style={{
        fontFamily: "SpaceGrotesk",
        fontWeight: 700,
        wordBreak: "break-all",
        color: dark ? lightColor(0.9) : primaryColor(),
      }}
    >
      <div tw="flex flex-col items-center mb-4" style={{ gap: "0.5rem" }}>
        <div tw="flex items-center" style={{ gap: "0.75rem" }}>
          <span>Framedl</span>
          {isPro && (
            <span
              tw={dark && !isArena ? "bg-white rounded px-3 py-1" : ""}
              style={{ color: isArena && dark ? "white" : "green" }}
            >
              PRO
            </span>
          )}
          {type === "ARENA" && (
            <div
              tw="flex"
              style={{
                fontFamily: "SpaceGrotesk",
                color: dark ? "white" : undefined,
              }}
            >
              {/* {"⚔️ ARENA"} */}
              {"⚔️ ARENA"}
            </div>
          )}
        </div>
        {type !== "ARENA" && (
          <div
            tw={`flex items-center ${size === "lg" ? "text-4xl" : "text-3xl"}`}
            style={{ gap: "0.5rem" }}
          >
            <div tw="flex">{formatGameKey(game, customMaker)}</div>
            {isPro &&
              (game?.userData?.passOwnership === "OG" ||
                game?.userData?.passOwnership === "BASIC_AND_OG") && (
                <div tw="flex text-2xl">
                  <OGBadge />
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
