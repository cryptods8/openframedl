import { externalBaseUrl } from "@/app/constants";
import { NextResponse } from "next/server";

const FREEZE_TOKEN_ID = "1";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (id !== FREEZE_TOKEN_ID) {
    return NextResponse.json(
      { error: "Token not found" },
      { status: 404 }
    );
  }

  const metadata = {
    name: "Framedl Streak Freeze",
    description:
      "Protects your Framedl daily streak when you miss a day. Burn one Streak Freeze to cover a missed game and keep your streak alive.",
    image: `${externalBaseUrl}/streak-freeze-nft.png`,
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
