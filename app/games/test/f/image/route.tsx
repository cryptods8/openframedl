import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const F_ARR = [
  [1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1],
  [1, 1],
  [1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1],
  [1, 1],
  [1, 1, 0, 0, 2, 2],
  [1, 1, 0, 0, 2, 2],
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isFrozen = searchParams.get("frozen") === "true";

  const gap = 8;
  const cellSize = 48;
  const rows = 14;
  const cols = 14;
  const padding = 0;
  const width = cols * cellSize + gap * (cols - 1) + padding * 2;
  const height = rows * cellSize + gap * (rows - 1) + padding * 2;

  // Create a blank white canvas
  const image = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  });

  const fRows = 10;
  const fCols = 6;

  // SVG Filter for frost/ice effect
  const filters = isFrozen
    ? `
    <defs>
      <filter id="frost">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="glow">
         <feGaussianBlur stdDeviation="2" result="blur" />
         <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  `
    : "";

  // Create SVG with rectangles for each cell
  const svgRects = F_ARR.flatMap((row, i) => {
    return (
      row
        // .filter((col) => col > 0)
        .map((col, j) => {
          let color =
            col === 1
              ? "rgb(0,128,0)" // green
              : col === 2
                ? "rgb(255,165,0)" // orange
                : null;

          if (color == null) {
            return null;
          }

          if (isFrozen) {
            // Adjust colors to be more "icy"
            if (col === 1) color = "rgb(0,128,228)"; // "rgba(12, 87, 131, 1)"; // Icy green
            if (col === 2) color = "rgb(255,165,228)"; // "rgba(0, 204, 255, 1)"; // Icy orange
            // if (col === 1) color = "rgba(12, 87, 131, 1)"; // Icy green
            // if (col === 2) color = "rgba(0, 204, 255, 1)"; // Icy orange
          }

          const rowNum = i + (rows - fRows) / 2;
          const colNum = j + (cols - fCols) / 2;
          const x = padding + colNum * (cellSize + gap);
          const y = padding + rowNum * (cellSize + gap);
          const opacity = isFrozen ? 0.75 : 1;
          return `
        <rect
        x="${x}"
        y="${y}"
        width="${cellSize}"
        height="${cellSize}"
        fill="${color}"
        opacity="${opacity}"
        />
        `;
        })
        .filter((x) => x != null)
    );
  }).join("");

  // Snowflake Icon paths from SnowFlakeIcon.tsx
  const snowflakePath = `
    <path d="M27,3c0.6,0,1,0.4,1,1v45.9c0,0.6-0.4,1-1,1h-2c-0.6,0-1-0.4-1-1V4c0-0.6,0.4-1,1-1H27z" />
    <path d="M26,17.2l-8.1-8.1c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0l5.3,5.3l5.3-5.3c0.4-0.4,1-0.4,1.4,0  l1.4,1.4c0.4,0.4,0.4,1,0,1.4L26,17.2" />
    <path d="M26,36.7l8.1,8.1c0.4,0.4,0.4,1,0,1.4l-1.4,1.4c-0.4,0.4-1,0.4-1.4,0L26,42.3l-5.3,5.3c-0.4,0.4-1,0.4-1.4,0  l-1.4-1.4c-0.4-0.4-0.4-1,0-1.4L26,36.7" />
    <path d="M47.1,15.6c0.3,0.5,0.2,1.1-0.4,1.4L7.2,40.3c-0.5,0.3-1.1,0.2-1.4-0.4l-1-1.7c-0.3-0.5-0.2-1.1,0.4-1.4  l39.5-23.4c0.5-0.3,1.1-0.2,1.4,0.4L47.1,15.6z" />
    <path d="M34.4,22l2.8-11.1c0.1-0.6,0.6-0.9,1.2-0.7l1.9,0.5c0.6,0.1,0.9,0.6,0.7,1.2l-1.9,7.3l7.3,1.9  c0.6,0.1,0.9,0.6,0.7,1.2l-0.5,1.9c-0.1,0.6-0.6,0.9-1.2,0.7L34.4,22" />
    <path d="M17.6,31.9L14.8,43c-0.1,0.6-0.6,0.9-1.2,0.7l-1.9-0.5c-0.6-0.1-0.9-0.6-0.7-1.2l1.9-7.3l-7.3-1.9  c-0.6-0.1-0.9-0.6-0.7-1.2l0.5-1.9C5.5,29.1,6,28.8,6.6,29L17.6,31.9" />
    <path d="M5.9,13.9c0.3-0.5,0.9-0.7,1.4-0.4l39.5,23.4c0.5,0.3,0.7,0.9,0.4,1.4l-1,1.7c-0.3,0.5-0.9,0.7-1.4,0.4  L5.2,17c-0.5-0.3-0.7-0.9-0.4-1.4L5.9,13.9z" />
    <path d="M17.6,22L6.5,24.9c-0.6,0.1-1.1-0.1-1.2-0.7l-0.5-1.9c-0.1-0.6,0.1-1.1,0.7-1.2l7.3-1.9l-1.9-7.3  c-0.1-0.6,0.1-1.1,0.7-1.2l1.9-0.5c0.6-0.1,1.1,0.1,1.2,0.7L17.6,22" />
    <path d="M34.3,31.9L45.4,29c0.6-0.1,1.1,0.1,1.2,0.7l0.5,1.9c0.1,0.6-0.1,1.1-0.7,1.2l-7.3,1.9L41,42  c0.1,0.6-0.1,1.1-0.7,1.2l-1.9,0.5c-0.6,0.1-1.1-0.1-1.2-0.7L34.3,31.9" />
  `;

  let snowflakes = "";
  if (isFrozen) {
    const snowflakesArr: {
      x: number;
      y: number;
      s: number;
      opacity: number;
    }[] = [];
    let attempts = 0;
    const maxAttempts = 10000;

    while (snowflakesArr.length < 50 && attempts < maxAttempts) {
      const s = 4 * (0.2 + Math.random() * 0.4);
      const x = Math.random() * width;
      const y = Math.random() * height;

      let overlap = false;
      for (const sf of snowflakesArr) {
        const cx1 = sf.x + 25 * sf.s;
        const cy1 = sf.y + 25 * sf.s;
        const cx2 = x + 25 * s;
        const cy2 = y + 25 * s;

        const dx = cx1 - cx2;
        const dy = cy1 - cy2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const minDist = 22 * s + 22 * sf.s;
        if (dist < minDist) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        const opacity = 0.5; //((s - 0.4) / 2.2) * 0.75 + 0.25;
        snowflakesArr.push({ x, y, s, opacity });
      }
      attempts++;
    }

    snowflakes = snowflakesArr
      .map(({ x, y, s, opacity }) => {
        return `<g transform="translate(${x}, ${y}) scale(${s})" fill="rgba(255, 255, 255, ${opacity})">${snowflakePath}</g>`;
      })
      .join("");
  }

  const overlay = isFrozen
    ? `<rect x="0" y="0" width="${width}" height="${height}" fill="rgba(195, 230, 255, 0.25)" />`
    : // ? "" // `<rect x="0" y="0" width="${width}" height="${height}" fill="rgba(100, 200, 255, 0.5)" />`
      "";

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${filters}
      ${svgRects}
      ${overlay}
      ${snowflakes}
    </svg>
  `;
  // const svg = `
  //   <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  //     ${svgRects}
  //     ${snowflakes}
  //   </svg>
  // `;

  // Composite the SVG onto the white background
  const buffer = await image
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
    },
  });
}
