import type { Metadata } from "next";

import "./globals.css";
import "@farcaster/auth-kit/styles.css";
import { externalBaseUrl, isPro } from "./constants";
import { Providers } from "./api/providers/providers";
import { Toaster } from "./ui/toasts/toaster";
import { AppConfigProvider } from "./contexts/app-config-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Framedl by ds8",
  description: "Wordle in a frame",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appConfig = {
    externalBaseUrl,
    isPro,
    domain: process.env["NEXT_PUBLIC_DOMAIN"],
    gameNftCa: process.env["NEXT_PUBLIC_GAME_NFT_CA"],
    gameNftChainId: process.env["NEXT_PUBLIC_GAME_NFT_CHAIN_ID"],
    gameNftMintPrice: process.env["NEXT_PUBLIC_GAME_NFT_MINT_PRICE"],
    gameNftErc20TokenConfig:
      process.env["NEXT_PUBLIC_GAME_NFT_ERC20_TOKEN_CONFIG"],
    badgeNftCa: process.env["NEXT_PUBLIC_BADGE_NFT_CA"],
    badgeNftChainId: process.env["NEXT_PUBLIC_BADGE_NFT_CHAIN_ID"],
    streakFreezeCa: process.env["NEXT_PUBLIC_STREAK_FREEZE_CA"],
    streakFreezeChainId: process.env["NEXT_PUBLIC_STREAK_FREEZE_CHAIN_ID"],
    streakFreezeMintPrice:
      process.env["NEXT_PUBLIC_STREAK_FREEZE_NFT_MINT_PRICE"],
  };

  return (
    <html lang="en">
      {isPro && (
        <head>
          <link rel="icon" href="/pro-icon.png" sizes="any" />
        </head>
      )}
      <body className="bg-primary-100 text-primary-900/80">
        <div className="w-full min-h-dvh flex flex-col items-center justify-center font-inter app-layout">
          <AppConfigProvider config={appConfig}>
            <Providers>{children}</Providers>
          </AppConfigProvider>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
