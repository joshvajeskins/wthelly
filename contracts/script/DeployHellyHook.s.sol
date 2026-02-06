// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {HellyHook} from "../src/HellyHook.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

contract DeployHellyHook is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address poolManager = vm.envAddress("POOL_MANAGER");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Mine hook address — V4 encodes permissions in the address bits
        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG);

        bytes memory constructorArgs = abi.encode(
            IPoolManager(poolManager),
            address(usdc),
            uint256(200)
        );

        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_FACTORY, // inherited from forge-std Script
            flags,
            type(HellyHook).creationCode,
            constructorArgs
        );
        console.log("Mining hook address:", hookAddress);

        // Deploy with CREATE2 salt
        HellyHook hook = new HellyHook{salt: salt}(
            IPoolManager(poolManager),
            address(usdc),
            200
        );
        console.log("HellyHook deployed at:", address(hook));
        require(address(hook) == hookAddress, "Hook address mismatch");

        vm.stopBroadcast();
    }
}
