import type { Metadata } from "next";

import "./globals.css";
import "@farcaster/auth-kit/styles.css";

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
      <body className="bg-primary-100 text-primary-900/80">
        <div className="w-full min-h-dvh flex flex-col items-center justify-center font-inter">
          {children}
        </div>
      </body>
    </html>
  );
}
