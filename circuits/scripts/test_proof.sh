#!/bin/bash
set -e

CIRCUIT_NAME="settlement_verify"
BUILD_DIR="build"

echo "=== Testing $CIRCUIT_NAME proof ==="

# Step 1: Generate witness from test input
echo "[1/3] Generating witness..."
node $BUILD_DIR/${CIRCUIT_NAME}_js/generate_witness.js \
  $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm \
  inputs/test_settlement.json \
  $BUILD_DIR/${CIRCUIT_NAME}_witness.wtns

# Step 2: Generate proof
echo "[2/3] Generating Groth16 proof..."
npx snarkjs groth16 prove \
  $BUILD_DIR/${CIRCUIT_NAME}.zkey \
  $BUILD_DIR/${CIRCUIT_NAME}_witness.wtns \
  $BUILD_DIR/${CIRCUIT_NAME}_proof.json \
  $BUILD_DIR/${CIRCUIT_NAME}_public.json

echo "Public signals:"
cat $BUILD_DIR/${CIRCUIT_NAME}_public.json

# Step 3: Verify proof
echo ""
echo "[3/3] Verifying proof..."
npx snarkjs groth16 verify \
  $BUILD_DIR/${CIRCUIT_NAME}_vkey.json \
  $BUILD_DIR/${CIRCUIT_NAME}_public.json \
  $BUILD_DIR/${CIRCUIT_NAME}_proof.json

echo ""
echo "=== Test complete ==="
