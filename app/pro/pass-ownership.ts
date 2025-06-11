// Setup: npm install alchemy-sdk
import { Alchemy, Network } from "alchemy-sdk";
import * as fabric from "@withfabric/protocol-sdks/stpv2";
import { configureFabricSDK } from "@withfabric/protocol-sdks";
import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

configureFabricSDK({
  wagmiConfig: wagmiConfig,
});

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

async function getNftPasses(address: string): Promise<string[]> {
  try {
    const nfts = await alchemy.nft.getNftsForOwner(address, {
      contractAddresses: tokenContractAddresses,
      omitMetadata: true,
    });
    return nfts.ownedNfts
      .filter((n) => parseInt(n.balance, 10) > 0)
      .map((n) => n.tokenId);
  } catch (e) {
    console.error("Error getting NFT passes", e);
    return [];
  }
}

async function getFabricPasses(address: string): Promise<string[]> {
  try {
    const sub = await fabric.subscriptionOf({
      contractAddress: "0x67585412a09b30e43d071fd9a4a2101cf5f9bab6",
      chainId: 8453,
      account: address as `0x${string}`,
    });
    if (sub.expiresAt * 1000 > Date.now()) {
      if (sub.tierId !== 1 && sub.tierId !== 2) {
        return [];
      }
      console.log("Valid tier", address, sub);
      return [sub.tierId.toString()];
    }
    return [];
  } catch (e) {
    console.error("Error getting fabric pass", e);
    return [];
  }
}

// check for pass ownership, if the user has a pass, return the pass type, he can have both passes
export async function checkPassOwnership(
  addresses: string[]
): Promise<FramedlProPassOwnership | null> {
  console.debug("Checking pass ownership for", addresses);

  // debugging
  // if (addresses.some((a) => a.toLowerCase() === "0x000Cbf0BEC88214AAB15bC1Fa40d3c30b3CA97a9".toLowerCase())) {
  //   return null;
  // }

  const promises = addresses.flatMap((a) => [
    getNftPasses(a),
    getFabricPasses(a),
  ]);
  const results = await Promise.all(promises);
  const tokenIdsMap = results.flat().reduce((acc, tokenId) => {
    acc[tokenId] = true;
    return acc;
  }, {} as Record<string, boolean>);
  const hasBasicPass = tokenIdsMap["1"] || tokenIdsMap["6"];
  const hasOGPass = tokenIdsMap["2"];

  console.log("Pass ownership", { addresses, hasBasicPass, hasOGPass });

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
