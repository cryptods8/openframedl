import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const startedAt = new Date().toISOString();

export async function GET() {
  const commit =
    process.env["GIT_COMMIT_SHA"] ||
    process.env["VERCEL_GIT_COMMIT_SHA"] ||
    null;
  const builtAt = process.env["BUILD_TIME"] || null;

  return NextResponse.json({
    status: "ok",
    commit: commit ? commit.slice(0, 7) : null,
    commitFull: commit,
    builtAt,
    startedAt,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
