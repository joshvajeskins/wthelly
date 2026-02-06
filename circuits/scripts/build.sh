#!/bin/bash
set -e

CIRCUIT_NAME="settlement_verify"
BUILD_DIR="build"
PTAU_DIR="ptau"

echo "=== Building $CIRCUIT_NAME circuit ==="

# Create directories
mkdir -p $BUILD_DIR $PTAU_DIR

# Step 1: Compile circuit
echo "[1/6] Compiling circuit..."
circom ${CIRCUIT_NAME}.circom --r1cs --wasm --sym -o $BUILD_DIR -l node_modules

# Step 2: Get circuit info
echo "[2/6] Circuit info:"
npx snarkjs r1cs info $BUILD_DIR/${CIRCUIT_NAME}.r1cs

# Step 3: Download Powers of Tau (if not present)
PTAU_FILE="$PTAU_DIR/pot16_final.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo "[3/6] Downloading Powers of Tau (pot16)..."
    curl -L -o "$PTAU_FILE" "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_16.ptau"
else
    echo "[3/6] Powers of Tau already downloaded"
fi

# Step 4: Setup (generate zkey)
echo "[4/6] Generating proving key (zkey)..."
npx snarkjs groth16 setup $BUILD_DIR/${CIRCUIT_NAME}.r1cs $PTAU_FILE $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey

# Contribute to ceremony (non-interactive for dev)
echo "dev-entropy" | npx snarkjs zkey contribute $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey $BUILD_DIR/${CIRCUIT_NAME}.zkey --name="dev contribution" -v

# Step 5: Export verification key
echo "[5/6] Exporting verification key..."
npx snarkjs zkey export verificationkey $BUILD_DIR/${CIRCUIT_NAME}.zkey $BUILD_DIR/${CIRCUIT_NAME}_vkey.json

# Step 6: Export Solidity verifier
echo "[6/6] Exporting Solidity verifier..."
npx snarkjs zkey export solidityverifier $BUILD_DIR/${CIRCUIT_NAME}.zkey ../contracts/src/Groth16Verifier.sol

echo ""
echo "=== Build complete ==="
echo "  Circuit:    $BUILD_DIR/${CIRCUIT_NAME}.r1cs"
echo "  WASM:       $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
echo "  Zkey:       $BUILD_DIR/${CIRCUIT_NAME}.zkey"
echo "  Vkey:       $BUILD_DIR/${CIRCUIT_NAME}_vkey.json"
echo "  Verifier:   ../contracts/src/Groth16Verifier.sol"
