import { pgDb } from "@/app/db/pg/pg-db";
import { GameServiceImpl, GuessCharacter } from "@/app/game/game-service";
import { options } from "@/app/generate-image";
import {
  getGuessCharacterColorStyle,
  primaryColor,
} from "@/app/image-ui/image-utils";
import { ImageResponse } from "@vercel/og";
import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from 'sharp';

export const dynamic = "force-dynamic";

function toGuessedCharacters(word: string, guesses: string[]) {
  const gameService = new GameServiceImpl();
  const game = gameService.toGuessedGame({
    id: "1234567890",
    gameKey: "1234567890",
    isDaily: false,
    word: word,
    guesses: guesses,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    identityProvider: "fc",
    userId: "1234567890",
    status: "IN_PROGRESS",
    guessCount: 2,
    isHardMode: true,
    isHardModeRequired: null,
    userData: null,
    gameData: null,
    srcGameId: null,
    arenaId: null,
    arenaWordIndex: null,
  });
  return game.guesses;
}

type GuessCharacterWithHighlight = GuessCharacter & { highlight: boolean };

export async function GET(request: NextRequest) {
  const games = await pgDb
    .selectFrom("game as g")
    .where("g.gameKey", "<", "2025-01-01")
    .where("g.isDaily", "=", true)
    .where("g.status", "in", ["WON", "LOST"])
    .selectAll()
    .orderBy("g.gameKey", "asc")
    .orderBy("g.createdAt", "asc")
    .execute();
  const userId = request.nextUrl.searchParams.get("uid");

  const allGuesses = games
    .map((g) => toGuessedCharacters(g.word, g.guesses).map((guess) => guess.characters.map(c => ({...c, highlight: !userId || g.userId === userId}))))
    .flatMap((g) => g.flatMap((x) => x))
    .slice(0, 10000);

  const gap = 1;
  const cellSize = 4;
  const rows = Math.ceil(Math.sqrt(allGuesses.length));
  const padding = 64;
  const width = rows * cellSize + gap * (rows - 1) + padding * 2;
  const height = rows * cellSize + gap * (rows - 1) + padding * 2;

  // Create a blank white canvas
  const image = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });

  // Create SVG with rectangles for each cell
  const svgRects = allGuesses.map((c, index) => {
    const row = Math.floor(index / rows);
    const col = index % rows;
    const x = padding + col * (cellSize + gap);
    const y = padding + row * (cellSize + gap);
    
    const color = c?.status === "CORRECT" 
      ? "rgb(0,128,0)" // green
      : c?.status === "INCORRECT"
      ? "rgb(255,165,0)" // orange
      : primaryColor(0.24);
    const stroke = c.highlight ? "rgba(0,0,0,0)" : "rgb(255,255,255)";
    const strokeWidth = !!userId ? 2 : 0;

    return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
  }).join('');

  const svg = `
    <svg width="${width}" height="${height}">
      ${svgRects}
    </svg>
  `;

  // Composite the SVG onto the white background
  const buffer = await image
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toBuffer();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png'
    }
  });
}
