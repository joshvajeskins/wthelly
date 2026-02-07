// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title MockVerifier
/// @notice Always-true Groth16 verifier for E2E testing
contract MockVerifier {
    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[4] calldata
    ) external pure returns (bool) {
        return true;
    }
}
