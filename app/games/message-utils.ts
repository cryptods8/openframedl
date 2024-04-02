import { GameIdentityProvider, UserKey } from "../game/game-repository";

interface Context {
  clientProtocol?: {
    id: string;
  };
  message?: {
    requesterFid?: number;
    verifiedWalletAddress?: string;
  };
}

export function getUserKeyFromContext(context: Context): UserKey | null {
  const { clientProtocol, message } = context;
  if (!clientProtocol || !message) {
    return null;
  }
  let uidStr: string;
  let ipStr: GameIdentityProvider;
  if (clientProtocol?.id === "farcaster") {
    uidStr = message.requesterFid!.toString();
    ipStr = "fc";
  } else {
    uidStr = message.verifiedWalletAddress!;
    ipStr = "xmtp";
  }
  return { userId: uidStr, identityProvider: ipStr };
}
