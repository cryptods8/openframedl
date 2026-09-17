import { NextRequest, NextResponse } from "next/server";
import { getWordDefinition } from "@/app/words/definition-service";

interface RouteParams {
  params: {
    word: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { word } = params;

  if (!word || typeof word !== "string") {
    return NextResponse.json(
      { error: "Word parameter is required" },
      { status: 400 }
    );
  }

  const definition = await getWordDefinition(word);

  if (!definition) {
    return NextResponse.json(
      { error: "No definition found" },
      {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  }

  return NextResponse.json(definition, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
    },
  });
}
