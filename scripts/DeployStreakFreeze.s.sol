// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/StreakFreeze.sol";

contract DeployStreakFreeze is Script {
    function run() external {
        string memory uri = vm.envString("STREAK_FREEZE_URI");
        uint256 ethPrice = vm.envUint("STREAK_FREEZE_ETH_PRICE");
        address signer = vm.envAddress("STREAK_FREEZE_SIGNER");

        vm.startBroadcast();
        new StreakFreeze(uri, ethPrice, signer);
        vm.stopBroadcast();
    }
}
