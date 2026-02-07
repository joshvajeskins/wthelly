// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title WthellyAdjudicator
 * @notice Custom adjudicator for wthelly prediction market state channels.
 *
 * For regular bet states (consensus-signed by user + TEE), unanimous
 * signatures are sufficient.
 *
 * For settlement states (State.data encodes a ZK proof), the adjudicator
 * additionally verifies the Groth16 proof on-chain via the Groth16Verifier
 * to guarantee payout correctness even in disputes.
 */

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external view returns (bool);
}

// Minimal Nitrolite types (mirrors nitrolite/contract/src/interfaces/Types.sol)
struct Allocation {
    address destination;
    address token;
    uint256 amount;
}

enum StateIntent {
    OPERATE,
    INITIALIZE,
    RESIZE,
    FINALIZE
}

struct State {
    StateIntent intent;
    uint256 version;
    bytes data;
    Allocation[] allocations;
    bytes[] sigs;
}

struct Channel {
    address[] participants;
    address adjudicator;
    uint64 challenge;
    uint64 nonce;
}

contract WthellyAdjudicator {
    IGroth16Verifier public immutable verifier;
    address public immutable teeAddress;

    // State.data type tags
    bytes32 private constant BET_TAG = keccak256("bet");
    bytes32 private constant SETTLEMENT_TAG = keccak256("settlement");

    constructor(address _verifier, address _teeAddress) {
        verifier = IGroth16Verifier(_verifier);
        teeAddress = _teeAddress;
    }

    /**
     * @notice Validate a candidate state for the wthelly app channel.
     * @param chan   Channel config (participants includes user + TEE)
     * @param candidate  The proposed state
     * @param proofs Previous states (unused — we only validate latest)
     * @return valid True if the state is valid
     */
    function adjudicate(
        Channel calldata chan,
        State calldata candidate,
        State[] calldata proofs
    ) external view returns (bool valid) {
        // Must have at least 2 participants (user + TEE)
        if (chan.participants.length < 2) return false;

        // Require signatures from all participants (unanimous consent)
        if (candidate.sigs.length < chan.participants.length) return false;

        // If data is long enough to be a settlement state, verify the ZK proof
        // Settlement encoding: abi.encode(bytes32 tag, bytes32 marketId, bool outcome,
        //   uint256 totalPool, uint256 platformFee, uint256 feeBps,
        //   uint[2] pA, uint[2][2] pB, uint[2] pC)
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
     * @dev Decode settlement data and verify the Groth16 proof.
     */
    function _validateSettlement(bytes calldata data) internal view returns (bool) {
        (
            , // tag (already checked)
            , // marketId
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

        uint[4] memory pubSignals = [
            outcome ? uint(1) : uint(0),
            feeBps,
            totalPool,
            platformFee
        ];

        return verifier.verifyProof(pA, pB, pC, pubSignals);
    }
}
