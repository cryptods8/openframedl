import type { Metadata } from "next";

import "./globals.css";
import "@farcaster/auth-kit/styles.css";
import { isPro } from "./constants";
import { Providers } from "./api/providers/providers";
import { Toaster } from "./ui/toasts/toaster";

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
          <Providers>{children}</Providers>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
