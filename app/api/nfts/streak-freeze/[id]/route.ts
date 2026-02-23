import { externalBaseUrl, isPro } from "@/app/constants";
import { NextResponse } from "next/server";

const FREEZE_TOKEN_ID = "1";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let tokenId = id;
  if (id.startsWith("0x")) {
    tokenId = parseInt(id, 16).toString();
  } else {
    tokenId = parseInt(id, 10).toString();
  }

  if (tokenId !== FREEZE_TOKEN_ID) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  const appName = isPro ? "Framedl PRO" : "Framedl";
  const metadata = {
    name: `${appName} Streak Freeze`,
    description: `Protects your ${appName} daily streak when you miss a day. Burn one Streak Freeze to cover a missed game and keep your streak alive.`,
    image: `${externalBaseUrl}/api/nfts/streak-freeze/${FREEZE_TOKEN_ID}/image`,
    external_url: `${externalBaseUrl}`,
    properties: {
      category: "utility",
    },
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
