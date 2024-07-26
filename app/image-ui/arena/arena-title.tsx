import { GameTitle } from "../game-title";
import { primaryColor } from "../image-utils";

export type StickyPosition = "top" | "none";
export type SubtitlePlacement = "under" | "right";

export function ArenaTitle({
  subtitle,
  subtitlePlacement = "right",
  stickyPosition = "top",
  size = "sm",
}: {
  subtitle?: string | React.ReactNode;
  subtitlePlacement?: SubtitlePlacement;
  stickyPosition?: StickyPosition;
  size?: "sm" | "md";
}) {
  return (
    <div
      tw={`flex items-center ${
        subtitlePlacement === "right" ? "flex-row" : "flex-col"
      }`}
      style={{ columnGap: "1.5rem", rowGap: "1rem" }}
    >
      <div
        tw={`flex ${stickyPosition === "top" ? "rounded-b-xl" : "rounded-xl"} ${
          size === "md" ? "px-8 py-4" : "px-6 py-3"
        }`}
        style={{ backgroundColor: primaryColor(0.84) }}
      >
        <GameTitle type="ARENA" dark size={size} />
      </div>
      {subtitle && (
        <div
          tw="flex text-4xl"
          style={{
            fontFamily: "SpaceGrotesk",
            fontWeight: 700,
            color: primaryColor(),
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
