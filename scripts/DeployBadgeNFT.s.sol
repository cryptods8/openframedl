// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/BadgeNFT.sol";

contract DeployBadgeNFT is Script {
    function run() external {
        string memory uri = vm.envString("BADGE_NFT_URI");
        uint256 mintPrice = vm.envUint("BADGE_NFT_MINT_PRICE");
        address signer = vm.envAddress("BADGE_NFT_SIGNER");

        vm.startBroadcast();
        new BadgeNFT(uri, mintPrice, signer);
        vm.stopBroadcast();
    }
}
