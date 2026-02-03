// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {HellyHook} from "../src/HellyHook.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract HellyHookTest is Test {
    HellyHook public hook;
    MockUSDC public usdc;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xC4A7);

    bytes32 public marketId = keccak256("ETH-5k-2026");
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2%
    uint256 public constant ONE_USDC = 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        hook = new HellyHook(address(usdc), PLATFORM_FEE_BPS);

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
            1 hours
        );

        (
            string memory question,
            uint256 deadline,
            uint256 revealDeadline,
            bool resolved,
            bool outcome,
            uint256 totalYes,
            uint256 totalNo,
            bool settled,
            uint256 commitCount
        ) = hook.getMarket(marketId);

        assertEq(question, "Will ETH hit $5k by end of 2026?");
        assertEq(deadline, block.timestamp + 1 days);
        assertEq(revealDeadline, block.timestamp + 1 days + 1 hours);
        assertFalse(resolved);
        assertFalse(outcome);
        assertEq(totalYes, 0);
        assertEq(totalNo, 0);
        assertFalse(settled);
        assertEq(commitCount, 0);
    }

    function test_createMarket_revertDuplicate() public {
        hook.createMarket(marketId, "Q?", block.timestamp + 1 days, 1 hours);
        vm.expectRevert(HellyHook.MarketAlreadyExists.selector);
        hook.createMarket(marketId, "Q?", block.timestamp + 1 days, 1 hours);
    }

    function test_createMarket_revertNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(HellyHook.OnlyAdmin.selector);
        hook.createMarket(marketId, "Q?", block.timestamp + 1 days, 1 hours);
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
    //                     COMMITMENTS
    // =============================================================

    function test_submitCommitment() public {
        _createDefaultMarket();

        vm.prank(alice);
        hook.deposit(100 * ONE_USDC);

        bytes32 secret = keccak256("alice-secret");
        bytes32 commitHash = hook.getCommitmentHash(
            marketId, true, 100 * ONE_USDC, secret, alice
        );

        vm.prank(alice);
        hook.submitCommitment(marketId, commitHash, 100 * ONE_USDC);

        // Balance should be locked
        assertEq(hook.balances(alice), 0);

        // Check commitment stored
        (bytes32 storedHash, uint256 amount, address bettor, bool revealed, bool isYes) =
            hook.getCommitment(marketId, 1);
        assertEq(storedHash, commitHash);
        assertEq(amount, 100 * ONE_USDC);
        assertEq(bettor, alice);
        assertFalse(revealed);
        assertFalse(isYes);
    }

    function test_submitCommitment_revertAfterDeadline() public {
        _createDefaultMarket();

        vm.prank(alice);
        hook.deposit(100 * ONE_USDC);

        bytes32 secret = keccak256("alice-secret");
        bytes32 commitHash = hook.getCommitmentHash(
            marketId, true, 100 * ONE_USDC, secret, alice
        );

        // Warp past deadline
        vm.warp(block.timestamp + 2 days);

        vm.prank(alice);
        vm.expectRevert(HellyHook.BettingClosed.selector);
        hook.submitCommitment(marketId, commitHash, 100 * ONE_USDC);
    }

    function test_submitCommitment_revertAlreadyCommitted() public {
        _createDefaultMarket();

        vm.prank(alice);
        hook.deposit(200 * ONE_USDC);

        bytes32 secret = keccak256("alice-secret");
        bytes32 commitHash = hook.getCommitmentHash(
            marketId, true, 100 * ONE_USDC, secret, alice
        );

        vm.prank(alice);
        hook.submitCommitment(marketId, commitHash, 100 * ONE_USDC);

        vm.prank(alice);
        vm.expectRevert(HellyHook.AlreadyCommitted.selector);
        hook.submitCommitment(marketId, commitHash, 100 * ONE_USDC);
    }

    // =============================================================
    //                     REVEAL
    // =============================================================

    function test_revealBet() public {
        _createDefaultMarket();
        _depositAndCommit(alice, true, 100 * ONE_USDC, keccak256("alice-secret"));

        // Resolve market
        hook.resolveMarket(marketId, true);

        // Reveal
        vm.prank(alice);
        hook.revealBet(marketId, true, keccak256("alice-secret"));

        (,, , bool revealed, bool isYes) = hook.getCommitment(marketId, 1);
        assertTrue(revealed);
        assertTrue(isYes);

        // Check pool updated
        (,,,,,uint256 totalYes,,, ) = hook.getMarket(marketId);
        assertEq(totalYes, 100 * ONE_USDC);
    }

    function test_revealBet_revertNotResolved() public {
        _createDefaultMarket();
        _depositAndCommit(alice, true, 100 * ONE_USDC, keccak256("alice-secret"));

        vm.prank(alice);
        vm.expectRevert(HellyHook.MarketNotResolved.selector);
        hook.revealBet(marketId, true, keccak256("alice-secret"));
    }

    function test_revealBet_revertInvalidHash() public {
        _createDefaultMarket();
        _depositAndCommit(alice, true, 100 * ONE_USDC, keccak256("alice-secret"));

        hook.resolveMarket(marketId, true);

        vm.prank(alice);
        vm.expectRevert(HellyHook.InvalidCommitmentHash.selector);
        hook.revealBet(marketId, false, keccak256("alice-secret")); // Wrong direction
    }

    function test_revealBet_revertWindowClosed() public {
        _createDefaultMarket();
        _depositAndCommit(alice, true, 100 * ONE_USDC, keccak256("alice-secret"));

        hook.resolveMarket(marketId, true);

        // Warp past reveal deadline
        vm.warp(block.timestamp + 2 days);

        vm.prank(alice);
        vm.expectRevert(HellyHook.RevealWindowClosed.selector);
        hook.revealBet(marketId, true, keccak256("alice-secret"));
    }

    // =============================================================
    //                     SETTLEMENT
    // =============================================================

    function test_settleMarket_winnersGetPaid() public {
        _createDefaultMarket();

        // Alice bets YES $100
        _depositAndCommit(alice, true, 100 * ONE_USDC, keccak256("a-secret"));
        // Bob bets NO $200
        _depositAndCommit(bob, false, 200 * ONE_USDC, keccak256("b-secret"));
        // Charlie bets YES $150
        _depositAndCommit(charlie, true, 150 * ONE_USDC, keccak256("c-secret"));

        // Resolve as YES
        hook.resolveMarket(marketId, true);

        // Reveal all bets
        vm.prank(alice);
        hook.revealBet(marketId, true, keccak256("a-secret"));
        vm.prank(bob);
        hook.revealBet(marketId, false, keccak256("b-secret"));
        vm.prank(charlie);
        hook.revealBet(marketId, true, keccak256("c-secret"));

        // Settle
        hook.settleMarket(marketId);

        // Verify payouts
        // Loser pool = $200, Fee = 2% of $200 = $4, Net = $196
        // Alice share: 100/250 * $196 = $78.40 + $100 original = $178.40
        // Charlie share: 150/250 * $196 = $117.60 + $150 original = $267.60
        uint256 fee = (200 * ONE_USDC * 200) / 10000; // $4
        uint256 net = 200 * ONE_USDC - fee; // $196
        uint256 alicePayout = 100 * ONE_USDC + (100 * ONE_USDC * net) / (250 * ONE_USDC);
        uint256 charliePayout = 150 * ONE_USDC + (150 * ONE_USDC * net) / (250 * ONE_USDC);

        assertEq(hook.balances(alice), alicePayout);
        assertEq(hook.balances(charlie), charliePayout);
        assertEq(hook.balances(bob), 0); // Loser gets nothing
        assertEq(hook.balances(admin), fee); // Admin gets fee
    }

    function test_settleMarket_unrevealedForfeited() public {
        _createDefaultMarket();

        // Alice bets YES $100 (will reveal)
        _depositAndCommit(alice, true, 100 * ONE_USDC, keccak256("a-secret"));
        // Bob bets NO $200 (won't reveal)
        _depositAndCommit(bob, false, 200 * ONE_USDC, keccak256("b-secret"));

        // Resolve as YES
        hook.resolveMarket(marketId, true);

        // Only Alice reveals
        vm.prank(alice);
        hook.revealBet(marketId, true, keccak256("a-secret"));

        // Settle
        hook.settleMarket(marketId);

        // Bob's $200 is forfeited (unrevealed)
        // Distributable = 0 (no revealed losers) + 200 (unrevealed) = $200
        // Fee = 2% of $200 = $4, Net = $196
        // Alice gets: $100 + $196 = $296
        uint256 fee = (200 * ONE_USDC * 200) / 10000;
        uint256 net = 200 * ONE_USDC - fee;
        assertEq(hook.balances(alice), 100 * ONE_USDC + net);
        assertEq(hook.balances(admin), fee);
    }

    function test_settleMarket_revertNotResolved() public {
        _createDefaultMarket();
        vm.expectRevert(HellyHook.MarketNotResolved.selector);
        hook.settleMarket(marketId);
    }

    function test_settleMarket_revertAlreadySettled() public {
        _createDefaultMarket();
        _depositAndCommit(alice, true, 100 * ONE_USDC, keccak256("a-secret"));
        hook.resolveMarket(marketId, true);
        vm.prank(alice);
        hook.revealBet(marketId, true, keccak256("a-secret"));
        hook.settleMarket(marketId);

        vm.expectRevert(HellyHook.MarketAlreadySettled.selector);
        hook.settleMarket(marketId);
    }

    // =============================================================
    //                     FULL E2E FLOW
    // =============================================================

    function test_fullFlow() public {
        // 1. Create market
        hook.createMarket(
            marketId,
            "Will ETH hit $5k?",
            block.timestamp + 1 days,
            1 hours
        );

        // 2. Deposits
        vm.prank(alice);
        hook.deposit(500 * ONE_USDC);
        vm.prank(bob);
        hook.deposit(500 * ONE_USDC);
        vm.prank(charlie);
        hook.deposit(500 * ONE_USDC);

        // 3. Commitments
        bytes32 aliceSecret = keccak256("alice-full");
        bytes32 bobSecret = keccak256("bob-full");
        bytes32 charlieSecret = keccak256("charlie-full");

        bytes32 aliceHash = hook.getCommitmentHash(marketId, true, 100 * ONE_USDC, aliceSecret, alice);
        bytes32 bobHash = hook.getCommitmentHash(marketId, false, 200 * ONE_USDC, bobSecret, bob);
        bytes32 charlieHash = hook.getCommitmentHash(marketId, true, 150 * ONE_USDC, charlieSecret, charlie);

        vm.prank(alice);
        hook.submitCommitment(marketId, aliceHash, 100 * ONE_USDC);
        vm.prank(bob);
        hook.submitCommitment(marketId, bobHash, 200 * ONE_USDC);
        vm.prank(charlie);
        hook.submitCommitment(marketId, charlieHash, 150 * ONE_USDC);

        // 4. Resolve as YES
        hook.resolveMarket(marketId, true);

        // 5. Reveal all
        vm.prank(alice);
        hook.revealBet(marketId, true, aliceSecret);
        vm.prank(bob);
        hook.revealBet(marketId, false, bobSecret);
        vm.prank(charlie);
        hook.revealBet(marketId, true, charlieSecret);

        // 6. Settle
        hook.settleMarket(marketId);

        // 7. Verify
        uint256 loserPool = 200 * ONE_USDC;
        uint256 fee = (loserPool * PLATFORM_FEE_BPS) / 10000;
        uint256 net = loserPool - fee;
        uint256 winnerPool = 250 * ONE_USDC;

        uint256 aliceExpected = 100 * ONE_USDC + (100 * ONE_USDC * net / winnerPool);
        uint256 charlieExpected = 150 * ONE_USDC + (150 * ONE_USDC * net / winnerPool);

        // Remaining deposit balance (500 - bet amount)
        assertEq(hook.balances(alice), aliceExpected + 400 * ONE_USDC);
        assertEq(hook.balances(charlie), charlieExpected + 350 * ONE_USDC);
        assertEq(hook.balances(bob), 300 * ONE_USDC); // 500 - 200 (lost)

        // 8. Withdrawals
        uint256 aliceBal = hook.balances(alice);
        vm.prank(alice);
        hook.withdraw(aliceBal);
        assertEq(usdc.balanceOf(alice), 10000 * ONE_USDC - 500 * ONE_USDC + aliceBal);

        console.log("Alice final balance:", hook.balances(alice));
        console.log("Bob final balance:", hook.balances(bob));
        console.log("Charlie final balance:", hook.balances(charlie));
        console.log("Admin fee:", hook.balances(admin));
        console.log("Full flow test passed!");
    }

    // =============================================================
    //                     HELPERS
    // =============================================================

    function _createDefaultMarket() internal {
        hook.createMarket(
            marketId,
            "Will ETH hit $5k by end of 2026?",
            block.timestamp + 1 days,
            1 hours
        );
    }

    function _depositAndCommit(
        address user,
        bool isYes,
        uint256 amount,
        bytes32 secret
    ) internal {
        vm.prank(user);
        hook.deposit(amount);

        bytes32 commitHash = hook.getCommitmentHash(marketId, isYes, amount, secret, user);

        vm.prank(user);
        hook.submitCommitment(marketId, commitHash, amount);
    }
}
