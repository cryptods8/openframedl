import { externalBaseUrl, isPro } from '@/app/constants';
import { gameService } from '@/app/game/game-service'
import { formatGameKey, getDailyGameKey } from '@/app/game/game-utils';
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params

    const game = await gameService.load(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 }
      );
    }

    const todayKey = getDailyGameKey(new Date());
    const canRevealWord = !game.isCustom && !game.arenaId && (!game.isDaily || (isPro && game.gameKey < todayKey));

    // Set cache duration based on game status and word reveal
    const cacheDuration = (!game.completedAt || !canRevealWord) 
      ? 60 * 60 * 24        // 24 hours in seconds
      : 60 * 60 * 24 * 30;  // 30 days in seconds
    
    return NextResponse.json(
      {
        name: `Framedl ${formatGameKey(game)}`,
        description: "",
        image: `${externalBaseUrl}/api/nfts/games/${gameId}/image`,
        attributes: [
          {
            "trait_type": "Date Played",
            "value": game.isDaily ? game.gameKey : getDailyGameKey(game.createdAt)
          },
          {
            "trait_type": "Score",
            "value": game.guessCount
          },
          {
            "trait_type": "Word",
            "value": canRevealWord ? game.word : "?????"
          },
          {
            "trait_type": "Status",
            "value": game.status
          },
          {
            "trait_type": "Hard Mode",
            "value": game.isHardMode
          },
          {
            "trait_type": "Player",
            "value": game.userData?.username || game.userId
          }
        ]
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}`
        }
      }
    )
  } catch (error) {
    console.error('Error fetching game details:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch game details' 
      },
      { status: 500 }
    )
  }
}
