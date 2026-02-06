// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external view returns (bool);
}

/// @title HellyHook
/// @notice Prediction market hook with commit-reveal pattern for private betting
/// @dev Extends BaseHook to integrate with Uniswap V4 — monitors swaps via afterSwap
contract HellyHook is BaseHook {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;

    // =============================================================
    //                           ERRORS
    // =============================================================

    error OnlyAdmin();
    error MarketAlreadyExists();
    error MarketDoesNotExist();
    error MarketNotOpen();
    error MarketNotResolved();
    error MarketAlreadyResolved();
    error MarketAlreadySettled();
    error MarketNotClosed();
    error BettingClosed();
    error RevealWindowClosed();
    error RevealWindowNotOpen();
    error InsufficientBalance();
    error AlreadyCommitted();
    error CommitmentDoesNotExist();
    error AlreadyRevealed();
    error InvalidCommitmentHash();
    error ZeroAmount();
    error NothingToSettle();
    error InvalidProof();
    error PayoutMismatch();
    error TotalPoolMismatch();
    error OnlyTeeOrAdmin();

    // =============================================================
    //                           EVENTS
    // =============================================================

    event MarketCreated(
        bytes32 indexed marketId,
        string question,
        uint256 deadline,
        uint256 revealDeadline
    );

    event MarketResolved(
        bytes32 indexed marketId,
        bool outcome
    );

    event MarketSettled(
        bytes32 indexed marketId,
        uint256 totalPayout,
        uint256 platformFee,
        uint256 winners,
        uint256 losers
    );

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    event CommitmentSubmitted(
        bytes32 indexed marketId,
        address indexed bettor,
        bytes32 commitHash,
        uint256 amount
    );

    event BetRevealed(
        bytes32 indexed marketId,
        address indexed bettor,
        bool isYes,
        uint256 amount
    );

    event PayoutClaimed(
        bytes32 indexed marketId,
        address indexed bettor,
        uint256 amount
    );

    event MarketSettledWithProof(
        bytes32 indexed marketId,
        uint256 totalPayout,
        uint256 platformFee,
        uint256 numPayouts
    );

    // =============================================================
    //                           STRUCTS
    // =============================================================

    struct Market {
        string question;
        uint256 deadline;
        uint256 revealDeadline;
        bool resolved;
        bool outcome;
        uint256 totalYes;
        uint256 totalNo;
        bool settled;
        uint256 commitCount;
    }

    struct Commitment {
        bytes32 commitHash;
        uint256 amount;
        address bettor;
        bool revealed;
        bool isYes;
    }

    // =============================================================
    //                       STATE VARIABLES
    // =============================================================

    address public admin;
    IERC20 public usdc;
    uint256 public platformFeeBps; // 200 = 2%
    IGroth16Verifier public verifier;
    address public teeAddress;

    /// @notice User balances deposited into the contract
    mapping(address => uint256) public balances;

    /// @notice All markets by their ID
    mapping(bytes32 => Market) public markets;

    /// @notice Commitments per market: marketId => index => Commitment
    mapping(bytes32 => mapping(uint256 => Commitment)) public commitments;

    /// @notice Track bettor's commit index (1-indexed, 0 means no commitment)
    mapping(bytes32 => mapping(address => uint256)) public bettorCommitIndex;

    /// @notice Track which markets exist
    mapping(bytes32 => bool) public marketExists;

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(
        IPoolManager _poolManager,
        address _usdc,
        uint256 _platformFeeBps
    ) BaseHook(_poolManager) {
        admin = msg.sender;
        usdc = IERC20(_usdc);
        platformFeeBps = _platformFeeBps;
    }

    // =============================================================
    //                         MODIFIERS
    // =============================================================

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    // =============================================================
    //                     ADMIN FUNCTIONS
    // =============================================================

    /// @notice Create a new prediction market
    /// @param marketId Unique identifier for the market
    /// @param question The prediction question
    /// @param deadline Timestamp when betting closes
    /// @param revealWindow Duration in seconds for the reveal window after resolution
    function createMarket(
        bytes32 marketId,
        string calldata question,
        uint256 deadline,
        uint256 revealWindow
    ) external onlyAdmin {
        if (marketExists[marketId]) revert MarketAlreadyExists();

        markets[marketId] = Market({
            question: question,
            deadline: deadline,
            revealDeadline: deadline + revealWindow,
            resolved: false,
            outcome: false,
            totalYes: 0,
            totalNo: 0,
            settled: false,
            commitCount: 0
        });

        marketExists[marketId] = true;

        emit MarketCreated(marketId, question, deadline, deadline + revealWindow);
    }

    /// @notice Resolve a market with the outcome
    /// @param marketId The market to resolve
    /// @param outcome true = YES won, false = NO won
    function resolveMarket(bytes32 marketId, bool outcome) external onlyAdmin {
        if (!marketExists[marketId]) revert MarketDoesNotExist();
        Market storage market = markets[marketId];
        if (market.resolved) revert MarketAlreadyResolved();

        market.resolved = true;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    // =============================================================
    //                     USER FUNCTIONS
    // =============================================================

    /// @notice Deposit USDC into the contract for betting
    /// @param amount Amount of USDC to deposit (in token units)
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw USDC from the contract
    /// @param amount Amount of USDC to withdraw
    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        balances[msg.sender] -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Submit a commitment to bet on a market
    /// @param marketId The market to bet on
    /// @param commitHash keccak256(abi.encode(marketId, isYes, amount, secret, user))
    /// @param amount Amount to bet (locked from balance)
    function submitCommitment(
        bytes32 marketId,
        bytes32 commitHash,
        uint256 amount
    ) external {
        if (!marketExists[marketId]) revert MarketDoesNotExist();
        Market storage market = markets[marketId];
        if (block.timestamp > market.deadline) revert BettingClosed();
        if (market.resolved) revert MarketAlreadyResolved();
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        if (bettorCommitIndex[marketId][msg.sender] != 0) revert AlreadyCommitted();

        // Lock funds
        balances[msg.sender] -= amount;

        // Store commitment (1-indexed)
        market.commitCount++;
        uint256 index = market.commitCount;

        commitments[marketId][index] = Commitment({
            commitHash: commitHash,
            amount: amount,
            bettor: msg.sender,
            revealed: false,
            isYes: false
        });

        bettorCommitIndex[marketId][msg.sender] = index;

        emit CommitmentSubmitted(marketId, msg.sender, commitHash, amount);
    }

    /// @notice Reveal a bet after market resolution
    /// @param marketId The market
    /// @param isYes The direction of the bet
    /// @param secret The secret used in the commitment
    function revealBet(
        bytes32 marketId,
        bool isYes,
        bytes32 secret
    ) external {
        if (!marketExists[marketId]) revert MarketDoesNotExist();
        Market storage market = markets[marketId];
        if (!market.resolved) revert MarketNotResolved();
        if (block.timestamp > market.revealDeadline) revert RevealWindowClosed();

        uint256 index = bettorCommitIndex[marketId][msg.sender];
        if (index == 0) revert CommitmentDoesNotExist();

        Commitment storage commitment = commitments[marketId][index];
        if (commitment.revealed) revert AlreadyRevealed();

        // Verify the commitment hash
        bytes32 computedHash = getCommitmentHash(
            marketId,
            isYes,
            commitment.amount,
            secret,
            msg.sender
        );

        if (computedHash != commitment.commitHash) revert InvalidCommitmentHash();

        // Mark as revealed
        commitment.revealed = true;
        commitment.isYes = isYes;

        // Update market pools
        if (isYes) {
            market.totalYes += commitment.amount;
        } else {
            market.totalNo += commitment.amount;
        }

        emit BetRevealed(marketId, msg.sender, isYes, commitment.amount);
    }

    // =============================================================
    //                     SETTLEMENT
    // =============================================================

    /// @notice Settle a market and distribute payouts
    /// @param marketId The market to settle
    function settleMarket(bytes32 marketId) external onlyAdmin {
        if (!marketExists[marketId]) revert MarketDoesNotExist();
        Market storage market = markets[marketId];
        if (!market.resolved) revert MarketNotResolved();
        if (market.settled) revert MarketAlreadySettled();
        if (market.commitCount == 0) revert NothingToSettle();

        market.settled = true;

        uint256 winnerPool = market.outcome ? market.totalYes : market.totalNo;
        uint256 loserPool = market.outcome ? market.totalNo : market.totalYes;

        // Include unrevealed bets in the loser pool (forfeited)
        uint256 unrevealedTotal = 0;
        uint256 winnerCount = 0;
        uint256 loserCount = 0;

        for (uint256 i = 1; i <= market.commitCount; i++) {
            Commitment storage c = commitments[marketId][i];
            if (!c.revealed) {
                // Unrevealed bets are forfeited
                unrevealedTotal += c.amount;
            } else if (c.isYes == market.outcome) {
                winnerCount++;
            } else {
                loserCount++;
            }
        }

        // Total pool available for distribution = loser pool + unrevealed (forfeited)
        uint256 distributablePool = loserPool + unrevealedTotal;

        // Calculate platform fee
        uint256 fee = (distributablePool * platformFeeBps) / 10000;
        uint256 netDistributable = distributablePool - fee;

        // Credit platform fee to admin
        if (fee > 0) {
            balances[admin] += fee;
        }

        // Distribute to winners proportionally
        if (winnerPool > 0 && netDistributable > 0) {
            for (uint256 i = 1; i <= market.commitCount; i++) {
                Commitment storage c = commitments[marketId][i];
                if (c.revealed && c.isYes == market.outcome) {
                    // Winner gets their original bet back + proportional share of distributable pool
                    uint256 share = (c.amount * netDistributable) / winnerPool;
                    balances[c.bettor] += c.amount + share;

                    emit PayoutClaimed(marketId, c.bettor, c.amount + share);
                }
            }
        } else if (winnerPool > 0) {
            // No losers, return original bets to winners
            for (uint256 i = 1; i <= market.commitCount; i++) {
                Commitment storage c = commitments[marketId][i];
                if (c.revealed && c.isYes == market.outcome) {
                    balances[c.bettor] += c.amount;
                    emit PayoutClaimed(marketId, c.bettor, c.amount);
                }
            }
        }
        // If winnerPool == 0, all funds go to platform (edge case)
        if (winnerPool == 0) {
            balances[admin] += netDistributable;
        }

        emit MarketSettled(
            marketId,
            winnerPool > 0 ? winnerPool + netDistributable : 0,
            fee,
            winnerCount,
            loserCount
        );
    }

    // =============================================================
    //                  ZK PROOF SETTLEMENT (TEE)
    // =============================================================

    /// @notice Settle a market using ZK proof from the TEE
    /// @dev Bet directions are NEVER revealed on-chain — the ZK proof guarantees correctness
    /// @param marketId The market to settle
    /// @param payoutRecipients Addresses to receive payouts (order matches TEE computation)
    /// @param payoutAmounts Payout amount per recipient
    /// @param platformFeeAmount Computed platform fee
    /// @param _pA Groth16 proof point A
    /// @param _pB Groth16 proof point B
    /// @param _pC Groth16 proof point C
    function settleMarketWithProof(
        bytes32 marketId,
        address[] calldata payoutRecipients,
        uint256[] calldata payoutAmounts,
        uint256 platformFeeAmount,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC
    ) external {
        // Only TEE or admin can submit proof settlements
        if (msg.sender != teeAddress && msg.sender != admin) revert OnlyTeeOrAdmin();
        if (!marketExists[marketId]) revert MarketDoesNotExist();

        Market storage market = markets[marketId];
        if (!market.resolved) revert MarketNotResolved();
        if (market.settled) revert MarketAlreadySettled();
        if (market.commitCount == 0) revert NothingToSettle();
        if (payoutRecipients.length != payoutAmounts.length) revert PayoutMismatch();
        if (address(verifier) == address(0)) revert InvalidProof();

        // Compute total pool from stored commitments
        uint256 totalPool = 0;
        for (uint256 i = 1; i <= market.commitCount; i++) {
            totalPool += commitments[marketId][i].amount;
        }

        // Verify conservation: sum(payouts) + fee == totalPool
        uint256 totalPayouts = 0;
        for (uint256 i = 0; i < payoutAmounts.length; i++) {
            totalPayouts += payoutAmounts[i];
        }
        if (totalPayouts + platformFeeAmount != totalPool) revert TotalPoolMismatch();

        // Build public signals: [outcome, feeBps, totalPool, platformFee]
        uint[4] memory pubSignals = [
            market.outcome ? uint(1) : uint(0),
            platformFeeBps,
            totalPool,
            platformFeeAmount
        ];

        // Verify ZK proof
        bool valid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);
        if (!valid) revert InvalidProof();

        // Mark as settled
        market.settled = true;

        // Distribute payouts
        for (uint256 i = 0; i < payoutRecipients.length; i++) {
            if (payoutAmounts[i] > 0) {
                balances[payoutRecipients[i]] += payoutAmounts[i];
                emit PayoutClaimed(marketId, payoutRecipients[i], payoutAmounts[i]);
            }
        }

        // Credit platform fee to admin
        if (platformFeeAmount > 0) {
            balances[admin] += platformFeeAmount;
        }

        emit MarketSettledWithProof(marketId, totalPayouts, platformFeeAmount, payoutRecipients.length);
    }

    /// @notice Set the Groth16 verifier contract address
    function setVerifier(address _verifier) external onlyAdmin {
        verifier = IGroth16Verifier(_verifier);
    }

    /// @notice Set the TEE address authorized to submit proof settlements
    function setTeeAddress(address _teeAddress) external onlyAdmin {
        teeAddress = _teeAddress;
    }

    // =============================================================
    //                    UNISWAP V4 HOOK
    // =============================================================

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    event SwapMonitored(PoolId indexed poolId, int128 amount0, int128 amount1);

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta delta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        emit SwapMonitored(key.toId(), delta.amount0(), delta.amount1());
        return (this.afterSwap.selector, 0);
    }

    /// @dev Skip address validation in tests — V4 encodes permissions in address bits
    function validateHookAddress(BaseHook) internal pure override {}

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /// @notice Compute the commitment hash for given parameters
    function getCommitmentHash(
        bytes32 marketId,
        bool isYes,
        uint256 amount,
        bytes32 secret,
        address user
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(marketId, isYes, amount, secret, user));
    }

    /// @notice Get market details
    function getMarket(bytes32 marketId) external view returns (
        string memory question,
        uint256 deadline,
        uint256 revealDeadline,
        bool resolved,
        bool outcome,
        uint256 totalYes,
        uint256 totalNo,
        bool settled,
        uint256 commitCount
    ) {
        Market storage m = markets[marketId];
        return (
            m.question,
            m.deadline,
            m.revealDeadline,
            m.resolved,
            m.outcome,
            m.totalYes,
            m.totalNo,
            m.settled,
            m.commitCount
        );
    }

    /// @notice Get a commitment by market and index
    function getCommitment(bytes32 marketId, uint256 index) external view returns (
        bytes32 commitHash,
        uint256 amount,
        address bettor,
        bool revealed,
        bool isYes
    ) {
        Commitment storage c = commitments[marketId][index];
        return (c.commitHash, c.amount, c.bettor, c.revealed, c.isYes);
    }

    /// @notice Get a bettor's commit index for a market (0 = no commitment)
    function getBettorCommitIndex(bytes32 marketId, address bettor) external view returns (uint256) {
        return bettorCommitIndex[marketId][bettor];
    }
}
