// Setup: npm install alchemy-sdk
import { Alchemy, Network } from "alchemy-sdk";

export type FramedlProPassOwnership = "BASIC" | "OG" | "BASIC_AND_OG";

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.BASE_MAINNET,
};
const alchemy = new Alchemy(config);

const tokenContractAddresses =
  process.env.FRAMEDL_PASS_CONTRACT_ADDRESSES?.split(",") || [
    "0x402ae0eb018c623b14ad61268b786edd4ad87c56",
  ];

// check for pass ownership, if the user has a pass, return the pass type, he can have both passes
export async function checkPassOwnership(
  addresses: string[]
): Promise<FramedlProPassOwnership | null> {
  console.debug("Checking pass ownership for", addresses);
  const promises = addresses.map((a) =>
    alchemy.nft.getNftsForOwner(a, {
      contractAddresses: tokenContractAddresses,
      omitMetadata: true,
    })
  );
  const results = await Promise.all(promises);
  const tokenIdsMap = results
    .flatMap((r) => r.ownedNfts)
    .filter((n) => parseInt(n.balance, 10) > 0)
    .map((n) => n.tokenId)
    .reduce((acc, tokenId) => {
      acc[tokenId] = true;
      return acc;
    }, {} as Record<string, boolean>);
  const hasBasicPass = tokenIdsMap["1"] || tokenIdsMap["6"];
  const hasOGPass = tokenIdsMap["2"];
  console.debug("Pass ownership", { addresses, hasBasicPass, hasOGPass });
  if (hasBasicPass && hasOGPass) {
    return "BASIC_AND_OG";
  }
  if (hasOGPass) {
    return "OG";
  }
  if (hasBasicPass) {
    return "BASIC";
  }
  return null;
}
