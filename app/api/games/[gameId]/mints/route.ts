import { BaseUserRequest, getUserInfoFromRequest } from "@/app/api/api-utils";
import { NextRequest, NextResponse } from "next/server";
import * as gameRepo from "@/app/game/game-pg-repository";
import { MintMetadata } from "@/app/db/pg/types";

interface MintedRequest extends BaseUserRequest, Omit<MintMetadata, "timestamp"> {}

export async function POST(
  request: NextRequest,
  { params: { gameId } }: { params: { gameId: string } }
) {
  try {
    const body: MintedRequest = await request.json();

    const game = await gameRepo.findById(gameId);
    if (!game) {
      return new NextResponse("Game not found", { status: 404 });
    }
    const { userKey } = await getUserInfoFromRequest(request, body);
    if (
      userKey.userId !== game.userId ||
      userKey.identityProvider !== game.identityProvider
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!body.walletAddress || !body.hash || !body.chainId) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    const gameData = game.gameData;
    const mints = [...(gameData?.mints || [])];
    const mintByHashAndChainIdIndex = mints.findIndex(
      (mint) => mint.hash === body.hash && mint.chainId === body.chainId
    );
    if (mintByHashAndChainIdIndex !== -1 && mints[mintByHashAndChainIdIndex]) {
      mints[mintByHashAndChainIdIndex] = {
        ...mints[mintByHashAndChainIdIndex]!,
        tokenId: body.tokenId,
      };
    } else {
      mints.push({
        walletAddress: body.walletAddress,
        tokenId: body.tokenId,
        hash: body.hash,
        chainId: body.chainId,
        timestamp: Date.now(),
      });
    }

    await gameRepo.update(gameId, {
      gameData: JSON.stringify({
        ...gameData,
        mints,
      }),
    });

    return NextResponse.json({ success: true, data: { mints } });
  } catch (error) {
    console.error("[GAME_MINTED_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
