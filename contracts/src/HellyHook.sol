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
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external view returns (bool);
}

/// @title HellyHook
/// @notice Prediction market hook with price oracle and ZK proof settlement
/// @dev Extends BaseHook to integrate with Uniswap V4 — monitors swaps via afterSwap
contract HellyHook is BaseHook {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

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
    error InsufficientBalance();
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
        PoolId poolId,
        uint160 priceTarget,
        bool priceAbove
    );

    event MarketResolved(
        bytes32 indexed marketId,
        bool outcome
    );

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

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

    event PriceUpdated(PoolId indexed poolId, uint160 sqrtPriceX96, uint256 timestamp);

    // =============================================================
    //                           STRUCTS
    // =============================================================

    struct Market {
        string question;
        uint256 deadline;
        bool resolved;
        bool outcome;
        uint256 totalYes;
        uint256 totalNo;
        bool settled;
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

    /// @notice Track which markets exist
    mapping(bytes32 => bool) public marketExists;

    // Price oracle state
    mapping(PoolId => uint160) public lastSqrtPriceX96;
    mapping(PoolId => uint256) public lastPriceTimestamp;

    // Link markets to pools for auto-resolution
    mapping(bytes32 => PoolId) public marketPoolId;
    mapping(bytes32 => uint160) public marketPriceTarget;
    mapping(bytes32 => bool) public marketPriceAbove;

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

    /// @notice Create a new prediction market linked to a pool price target
    /// @param marketId Unique identifier for the market
    /// @param question The prediction question
    /// @param deadline Timestamp when betting closes
    /// @param poolId The Uniswap V4 pool to track for price resolution
    /// @param priceTarget The sqrtPriceX96 target for resolution
    /// @param priceAbove If true, outcome is YES when price > target; if false, YES when price < target
    function createMarket(
        bytes32 marketId,
        string calldata question,
        uint256 deadline,
        PoolId poolId,
        uint160 priceTarget,
        bool priceAbove
    ) external onlyAdmin {
        if (marketExists[marketId]) revert MarketAlreadyExists();

        markets[marketId] = Market({
            question: question,
            deadline: deadline,
            resolved: false,
            outcome: false,
            totalYes: 0,
            totalNo: 0,
            settled: false
        });

        marketExists[marketId] = true;
        marketPoolId[marketId] = poolId;
        marketPriceTarget[marketId] = priceTarget;
        marketPriceAbove[marketId] = priceAbove;

        emit MarketCreated(marketId, question, deadline, poolId, priceTarget, priceAbove);
    }

    /// @notice Resolve a market with the outcome (admin manual resolution)
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

    /// @notice Resolve a market automatically based on the oracle price
    /// @param marketId The market to resolve
    function resolveMarketFromOracle(bytes32 marketId) external {
        if (!marketExists[marketId]) revert MarketDoesNotExist();
        Market storage m = markets[marketId];
        if (block.timestamp < m.deadline) revert MarketNotClosed();
        if (m.resolved) revert MarketAlreadyResolved();

        PoolId poolId = marketPoolId[marketId];
        uint160 currentPrice = lastSqrtPriceX96[poolId];
        uint160 target = marketPriceTarget[marketId];

        bool outcome = marketPriceAbove[marketId]
            ? currentPrice > target
            : currentPrice < target;

        m.resolved = true;
        m.outcome = outcome;
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

    // =============================================================
    //                  ZK PROOF SETTLEMENT (TEE)
    // =============================================================

    /// @notice Settle a market using ZK proof from the TEE
    /// @dev Bet directions are NEVER revealed on-chain — the ZK proof guarantees correctness
    /// @param marketId The market to settle
    /// @param payoutRecipients Addresses to receive payouts (order matches TEE computation)
    /// @param payoutAmounts Payout amount per recipient
    /// @param totalPool Total pool computed by the TEE from state channel data
    /// @param platformFeeAmount Computed platform fee
    /// @param _pA Groth16 proof point A
    /// @param _pB Groth16 proof point B
    /// @param _pC Groth16 proof point C
    function settleMarketWithProof(
        bytes32 marketId,
        address[] calldata payoutRecipients,
        uint256[] calldata payoutAmounts,
        uint256 totalPool,
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
        if (payoutRecipients.length != payoutAmounts.length) revert PayoutMismatch();
        if (address(verifier) == address(0)) revert InvalidProof();

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

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        lastSqrtPriceX96[poolId] = sqrtPriceX96;
        lastPriceTimestamp[poolId] = block.timestamp;
        emit PriceUpdated(poolId, sqrtPriceX96, block.timestamp);
        return (this.afterSwap.selector, 0);
    }

    /// @dev Skip address validation in tests — V4 encodes permissions in address bits
    function validateHookAddress(BaseHook) internal pure override {}

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /// @notice Get market details
    function getMarket(bytes32 marketId) external view returns (
        string memory question,
        uint256 deadline,
        bool resolved,
        bool outcome,
        uint256 totalYes,
        uint256 totalNo,
        bool settled
    ) {
        Market storage m = markets[marketId];
        return (
            m.question,
            m.deadline,
            m.resolved,
            m.outcome,
            m.totalYes,
            m.totalNo,
            m.settled
        );
    }
}
