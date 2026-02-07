// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {HellyHook} from "../src/HellyHook.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

contract HellyHookTest is Test {
    HellyHook public hook;
    MockUSDC public usdc;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xC4A7);

    // Dummy PoolManager address for testing (hook skips address validation)
    IPoolManager constant MOCK_POOL_MANAGER = IPoolManager(address(0xdead));

    bytes32 public marketId = keccak256("ETH-5k-2026");
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2%
    uint256 public constant ONE_USDC = 1e6;

    // Default pool/price target values for tests
    PoolId public defaultPoolId = PoolId.wrap(keccak256("test-pool"));
    uint160 public defaultPriceTarget = 79228162514264337593543950336; // ~1.0 sqrtPriceX96
    bool public defaultPriceAbove = true;

    function setUp() public {
        usdc = new MockUSDC();
        hook = new HellyHook(MOCK_POOL_MANAGER, address(usdc), PLATFORM_FEE_BPS);

        // Mint USDC to test users
        usdc.mint(alice, 10000 * ONE_USDC);
        usdc.mint(bob, 10000 * ONE_USDC);
        usdc.mint(charlie, 10000 * ONE_USDC);

        // Approve hook for all users
        vm.prank(alice);
        usdc.approve(address(hook), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(hook), type(uint256).max);
        vm.prank(charlie);
        usdc.approve(address(hook), type(uint256).max);
    }

    // =============================================================
    //                     MARKET CREATION
    // =============================================================

    function test_createMarket() public {
        hook.createMarket(
            marketId,
            "Will ETH hit $5k by end of 2026?",
            block.timestamp + 1 days,
            defaultPoolId,
            defaultPriceTarget,
            defaultPriceAbove
        );

        (
            string memory question,
            uint256 deadline,
            bool resolved,
            bool outcome,
            uint256 totalYes,
            uint256 totalNo,
            bool settled
        ) = hook.getMarket(marketId);

        assertEq(question, "Will ETH hit $5k by end of 2026?");
        assertEq(deadline, block.timestamp + 1 days);
        assertFalse(resolved);
        assertFalse(outcome);
        assertEq(totalYes, 0);
        assertEq(totalNo, 0);
        assertFalse(settled);

        // Verify oracle linkage
        assertEq(PoolId.unwrap(hook.marketPoolId(marketId)), PoolId.unwrap(defaultPoolId));
        assertEq(hook.marketPriceTarget(marketId), defaultPriceTarget);
        assertTrue(hook.marketPriceAbove(marketId));
    }

    function test_createMarket_revertDuplicate() public {
        _createDefaultMarket();
        vm.expectRevert(HellyHook.MarketAlreadyExists.selector);
        hook.createMarket(
            marketId,
            "Q?",
            block.timestamp + 1 days,
            defaultPoolId,
            defaultPriceTarget,
            defaultPriceAbove
        );
    }

    function test_createMarket_revertNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(HellyHook.OnlyAdmin.selector);
        hook.createMarket(
            marketId,
            "Q?",
            block.timestamp + 1 days,
            defaultPoolId,
            defaultPriceTarget,
            defaultPriceAbove
        );
    }

    // =============================================================
    //                     DEPOSITS & WITHDRAWALS
    // =============================================================

    function test_deposit() public {
        vm.prank(alice);
        hook.deposit(100 * ONE_USDC);
        assertEq(hook.balances(alice), 100 * ONE_USDC);
        assertEq(usdc.balanceOf(address(hook)), 100 * ONE_USDC);
    }

    function test_deposit_revertZero() public {
        vm.prank(alice);
        vm.expectRevert(HellyHook.ZeroAmount.selector);
        hook.deposit(0);
    }

    function test_withdraw() public {
        vm.prank(alice);
        hook.deposit(100 * ONE_USDC);

        vm.prank(alice);
        hook.withdraw(50 * ONE_USDC);
        assertEq(hook.balances(alice), 50 * ONE_USDC);
    }

    function test_withdraw_revertInsufficient() public {
        vm.prank(alice);
        hook.deposit(100 * ONE_USDC);

        vm.prank(alice);
        vm.expectRevert(HellyHook.InsufficientBalance.selector);
        hook.withdraw(200 * ONE_USDC);
    }

    // =============================================================
    //                     MARKET RESOLUTION
    // =============================================================

    function test_resolveMarket_admin() public {
        _createDefaultMarket();

        hook.resolveMarket(marketId, true);

        (,, bool resolved, bool outcome,,,) = hook.getMarket(marketId);
        assertTrue(resolved);
        assertTrue(outcome);
    }

    function test_resolveMarket_revertAlreadyResolved() public {
        _createDefaultMarket();
        hook.resolveMarket(marketId, true);

        vm.expectRevert(HellyHook.MarketAlreadyResolved.selector);
        hook.resolveMarket(marketId, false);
    }

    function test_resolveMarketFromOracle_revertBeforeDeadline() public {
        _createDefaultMarket();

        vm.expectRevert(HellyHook.MarketNotClosed.selector);
        hook.resolveMarketFromOracle(marketId);
    }

    function test_resolveMarketFromOracle_revertAlreadyResolved() public {
        _createDefaultMarket();
        hook.resolveMarket(marketId, true);

        vm.warp(block.timestamp + 2 days);

        vm.expectRevert(HellyHook.MarketAlreadyResolved.selector);
        hook.resolveMarketFromOracle(marketId);
    }

    // =============================================================
    //                     HELPERS
    // =============================================================

    function _createDefaultMarket() internal {
        hook.createMarket(
            marketId,
            "Will ETH hit $5k by end of 2026?",
            block.timestamp + 1 days,
            defaultPoolId,
            defaultPriceTarget,
            defaultPriceAbove
        );
    }
}
