// import { ImageResponse as VercelOGImageResponse } from "@vercel/og";
import satori, { SatoriOptions } from "satori";
import sharp from "sharp";

import { loadEmoji, getIconCode } from "@/app/utils/twemoji";
import { options as defaultOptions } from "@/app/generate-image";

const emojiCache: Record<string, string> = {};

const loadAdditionalAsset = async (_code: string, _segment: string) => {
  if (_code === "emoji") {
    const emojiCode = getIconCode(_segment);
    if (emojiCache[emojiCode]) {
      return emojiCache[emojiCode]!;
    }
    const svg = await loadEmoji("twemoji", getIconCode(_segment));
    const pngData = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();
    const dataUrl = `data:image/png;base64,${pngData.toString("base64")}`;
    emojiCache[emojiCode] = dataUrl;
    return dataUrl;
  }
  return _code;
};

type ImageResponseOptions = {
  width?: number;
  height?: number;
  // fonts?: SatoriOptions["fonts"];
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
};

const optimizeFallback = process.env.OPTIMIZE_IMAGES === "true";

async function render(
  element: React.ReactElement,
  {
    optimize,
    ...options
  }: SatoriOptions & { width: number; height: number; optimize: boolean }
) {
  const width = options.width;
  const height = options.height;
  const start = Date.now();
  const svg = await satori(element, {
    ...options,
    width,
    height,
    loadAdditionalAsset,
  });
  const pngRenderer = sharp(Buffer.from(svg));
  if (optimize) {
    pngRenderer.resize((3 * width) / 5, (3 * height) / 5);
  }
  const png = await pngRenderer.toFormat("png").toBuffer();
  console.log(
    `[${new Date().toISOString()}] Image rendered in ${Date.now() - start}ms`
  );

  return png;
}

export function createImageResponse(
  element: React.ReactElement,
  options?: ImageResponseOptions & { optimize?: boolean }
) {
  const optimize = options?.optimize ?? optimizeFallback;
  // return new VercelOGImageResponse(element, options || defaultOptions);
  return new Response(
    new ReadableStream({
      async start(controller) {
        const png = await render(element, {
          width:
            options?.width ||
            ("width" in defaultOptions ? defaultOptions.width : 1200),
          height:
            options?.height ||
            ("height" in defaultOptions ? defaultOptions.height : 630),
          fonts: defaultOptions.fonts || [],
          optimize,
        });

        controller.enqueue(png);
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...options?.headers,
      },
      status: options?.status || 200,
      statusText: options?.statusText,
    }
  );
}
