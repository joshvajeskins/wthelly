// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {HellyHook} from "../src/HellyHook.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract DeployHellyHook is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy HellyHook with 2% platform fee (200 bps)
        HellyHook hook = new HellyHook(address(usdc), 200);
        console.log("HellyHook deployed at:", address(hook));

        vm.stopBroadcast();
    }
}
