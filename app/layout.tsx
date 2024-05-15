import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

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
      <body>
        <div className="w-full min-h-dvh bg-primary-100 flex flex-col items-center justify-center p-8 font-inter">
          {children}
          <div className="text-center mt-8 text-sm text-slate-600">
            Framedl made by{" "}
            <Link
              href="https://warpcast.com/ds8"
              className="underline hover:text-slate-700"
            >
              ds8
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
