import type { Metadata } from "next";

import "./globals.css";
import "@farcaster/auth-kit/styles.css";
import { externalBaseUrl, isPro } from "./constants";
import { Providers } from "./api/providers/providers";
import { Toaster } from "./ui/toasts/toaster";
import { AppConfigProvider } from "./contexts/app-config-context";

export const metadata: Metadata = {
  title: "Framedl by ds8",
  description: "Wordle in a frame",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {isPro && (
        <head>
          <link rel="icon" href="/pro-icon.png" sizes="any" />
        </head>
      )}
      <body className="bg-primary-100 text-primary-900/80">
        <div className="w-full min-h-dvh flex flex-col items-center justify-center font-inter">
          <AppConfigProvider config={{ externalBaseUrl, isPro }}>
            <Providers>{children}</Providers>
          </AppConfigProvider>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
