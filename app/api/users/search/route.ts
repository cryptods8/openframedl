import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Missing query 'q' param" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://client.warpcast.com/v2/search-users?q=${encodeURIComponent(
      query ?? ""
    )}&limit=40`
  ).then((res) => res.json());

  return NextResponse.json(res);
}
