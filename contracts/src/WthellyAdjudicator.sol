// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title WthellyAdjudicator
 * @notice Custom Nitrolite adjudicator for wthelly prediction market state channels.
 *
 * For regular bet states (consensus-signed by user + TEE), unanimous
 * cryptographic signature verification via Utils is required.
 *
 * For settlement states (State.data encodes a ZK proof + marketId), the
 * adjudicator additionally:
 *   1. Verifies the Groth16 proof on-chain
 *   2. Cross-checks the claimed outcome against HellyHook's recorded outcome
 */

import {IAdjudicator} from "nitrolite/interfaces/IAdjudicator.sol";
import {Channel, State, StateIntent} from "nitrolite/interfaces/Types.sol";
import {EIP712AdjudicatorBase} from "nitrolite/adjudicators/EIP712AdjudicatorBase.sol";
import {Utils} from "nitrolite/Utils.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external view returns (bool);
}

interface IHellyHook {
    function getMarket(bytes32 marketId)
        external
        view
        returns (
            string memory question,
            uint256 deadline,
            bool resolved,
            bool outcome,
            uint256 totalYes,
            uint256 totalNo,
            bool settled
        );
}

contract WthellyAdjudicator is IAdjudicator, EIP712AdjudicatorBase {
    using Utils for State;

    IGroth16Verifier public immutable verifier;
    IHellyHook public immutable hellyHook;

    /// @dev State.data type tag for settlement states
    bytes32 private constant SETTLEMENT_TAG = keccak256("settlement");

    constructor(
        address owner,
        address channelImpl,
        address _verifier,
        address _hellyHook
    ) EIP712AdjudicatorBase(owner, channelImpl) {
        verifier = IGroth16Verifier(_verifier);
        hellyHook = IHellyHook(_hellyHook);
    }

    /**
     * @notice Validate a candidate state for the wthelly app channel.
     * @param chan       Channel config (participants = [user, TEE])
     * @param candidate  The proposed state
     * @param proofs     Previous states (unused — we only validate latest)
     * @return valid     True if the state is valid
     */
    function adjudicate(
        Channel calldata chan,
        State calldata candidate,
        State[] calldata proofs
    ) external override returns (bool valid) {
        // We don't use proofs in this adjudicator
        if (proofs.length != 0) return false;

        bytes32 domainSeparator = getChannelImplDomainSeparator();

        // Version 0 = initial funding state
        if (candidate.version == 0) {
            return candidate.validateInitialState(chan, domainSeparator);
        }

        // All post-init states must not be INITIALIZE intent
        if (candidate.intent == StateIntent.INITIALIZE) return false;

        // Verify unanimous cryptographic signatures (user + TEE)
        if (!candidate.validateUnanimousStateSignatures(chan, domainSeparator)) {
            return false;
        }

        // If data encodes a settlement state, additionally verify ZK proof + outcome
        if (candidate.data.length > 64) {
            bytes32 tag = abi.decode(candidate.data[:32], (bytes32));
            if (tag == SETTLEMENT_TAG) {
                return _validateSettlement(candidate.data);
            }
        }

        // Regular bet state — unanimous signatures are sufficient
        return true;
    }

    /**
     * @dev Decode settlement data, verify the Groth16 proof, and cross-check
     *      the claimed outcome against HellyHook's on-chain resolution.
     *
     * Settlement encoding:
     *   abi.encode(bytes32 tag, bytes32 marketId, bool outcome,
     *     uint256 totalPool, uint256 platformFee, uint256 feeBps,
     *     uint[2] pA, uint[2][2] pB, uint[2] pC)
     */
    function _validateSettlement(bytes calldata data) internal view returns (bool) {
        (
            , // tag (already checked)
            bytes32 marketId,
            bool outcome,
            uint256 totalPool,
            uint256 platformFee,
            uint256 feeBps,
            uint[2] memory pA,
            uint[2][2] memory pB,
            uint[2] memory pC
        ) = abi.decode(
            data,
            (bytes32, bytes32, bool, uint256, uint256, uint256, uint[2], uint[2][2], uint[2])
        );

        // Cross-check: the claimed outcome must match HellyHook's recorded resolution
        (
            , // question
            , // deadline
            bool resolved,
            bool hookOutcome,
            , // totalYes
            , // totalNo
              // settled
        ) = hellyHook.getMarket(marketId);

        if (!resolved) return false; // Market not yet resolved on-chain
        if (outcome != hookOutcome) return false; // Outcome mismatch

        // Verify Groth16 proof — public signals encode the settlement parameters
        uint[4] memory pubSignals = [
            outcome ? uint(1) : uint(0),
            feeBps,
            totalPool,
            platformFee
        ];

        return verifier.verifyProof(pA, pB, pC, pubSignals);
    }
}
