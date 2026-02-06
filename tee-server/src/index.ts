import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { TeeAttestationService } from './tee-attestation.js';
import { decryptBetData } from './ecies.js';
import { BetStore, DecryptedBet } from './bet-store.js';
import { computeSettlement } from './settlement.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Initialize services
const teeService = new TeeAttestationService();
const betStore = new BetStore();

// ============================================
// Health & Status
// ============================================

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', teeMode: config.teeMode, timestamp: Date.now() });
});

app.get('/status', (_req, res) => {
  const metrics = teeService.getMetrics();
  res.json({
    teeMode: config.teeMode,
    publicKey: teeService.publicKeyHex,
    chainId: config.chainId,
    hellyHookAddress: config.hellyHookAddress,
    feeBps: config.feeBps,
    maxBets: config.maxBets,
    markets: betStore.getAllMarketIds().map(id => ({
      marketId: id,
      betCount: betStore.getBetCount(id),
      settled: !!betStore.getSettlement(id),
    })),
    metrics,
  });
});

// ============================================
// TEE Public Key (for ECIES encryption)
// ============================================

app.get('/pubkey', (_req, res) => {
  res.json({
    publicKey: teeService.publicKeyHex,
    format: 'uncompressed-secp256k1',
    teeMode: config.teeMode,
  });
});

// ============================================
// Submit Encrypted Bet
// ============================================

app.post('/bet', (req, res) => {
  try {
    const { marketId, encryptedData } = req.body;

    if (!marketId || !encryptedData) {
      res.status(400).json({ error: 'Missing marketId or encryptedData' });
      return;
    }

    teeService.incrementMetric('betsReceived');

    // Decrypt bet data using TEE's private key
    let betData;
    try {
      betData = decryptBetData(teeService.getPrivateKey(), encryptedData);
      teeService.incrementMetric('betsDecrypted');
    } catch (error) {
      teeService.incrementMetric('betsFailed');
      console.error('[TEE] Decryption failed:', error);
      res.status(400).json({ error: 'Failed to decrypt bet data' });
      return;
    }

    // Validate
    if (betData.marketId !== marketId) {
      res.status(400).json({ error: 'Market ID mismatch' });
      return;
    }

    // Store decrypted bet
    const bet: DecryptedBet = {
      marketId: betData.marketId,
      isYes: betData.isYes,
      amount: BigInt(betData.amount),
      secret: betData.secret,
      address: betData.address,
      commitHash: '', // Will be matched on-chain
      timestamp: Date.now(),
    };

    betStore.addBet(bet);

    console.log(`[TEE] Bet received: market=${marketId.slice(0, 10)}... address=${betData.address.slice(0, 10)}... direction=${betData.isYes ? 'YES' : 'NO'}`);

    res.json({
      success: true,
      marketId,
      betCount: betStore.getBetCount(marketId),
    });
  } catch (error) {
    console.error('[TEE] /bet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Trigger Settlement + ZK Proof
// ============================================

app.post('/settle/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params;
    const { outcome } = req.body; // true = YES won, false = NO won

    if (outcome === undefined) {
      res.status(400).json({ error: 'Missing outcome (true/false)' });
      return;
    }

    const existing = betStore.getSettlement(marketId);
    if (existing) {
      res.status(409).json({ error: 'Market already settled', settlement: serializeSettlement(existing) });
      return;
    }

    console.log(`[TEE] Settling market ${marketId.slice(0, 10)}... outcome=${outcome ? 'YES' : 'NO'}`);

    const result = await computeSettlement(marketId, outcome, betStore);

    teeService.incrementMetric('settlementsExecuted');
    if (result.proof) {
      teeService.incrementMetric('proofsGenerated');
    }

    res.json({
      success: true,
      settlement: serializeSettlement(result),
    });
  } catch (error: any) {
    console.error('[TEE] /settle error:', error);
    res.status(500).json({ error: error.message || 'Settlement failed' });
  }
});

// ============================================
// Get Settlement Result
// ============================================

app.get('/settlement/:marketId', (req, res) => {
  const { marketId } = req.params;
  const settlement = betStore.getSettlement(marketId);

  if (!settlement) {
    res.status(404).json({ error: 'Settlement not found' });
    return;
  }

  res.json({ settlement: serializeSettlement(settlement) });
});

// ============================================
// TEE Metrics & Attestation
// ============================================

app.get('/tee/metrics', (_req, res) => {
  res.json({
    teeMode: config.teeMode,
    publicKey: teeService.publicKeyHex.slice(0, 20) + '...',
    metrics: teeService.getMetrics(),
    totalBets: betStore.getTotalBetCount(),
    markets: betStore.getAllMarketIds().length,
  });
});

app.get('/tee/attestation', async (_req, res) => {
  const attestation = await teeService.getOysterAttestation();
  res.json({
    teeMode: config.teeMode,
    publicKey: teeService.publicKeyHex,
    oysterAttestation: attestation,
  });
});

// ============================================
// Helpers
// ============================================

function serializeSettlement(s: any) {
  return {
    ...s,
    platformFee: s.platformFee.toString(),
    totalPool: s.totalPool.toString(),
    payouts: s.payouts.map((p: any) => ({
      address: p.address,
      amount: p.amount.toString(),
    })),
  };
}

// ============================================
// Start Server
// ============================================

app.listen(config.port, () => {
  console.log(`\n[wthelly TEE Server]`);
  console.log(`  Mode:     ${config.teeMode}`);
  console.log(`  Port:     ${config.port}`);
  console.log(`  Chain:    ${config.chainId}`);
  console.log(`  Contract: ${config.hellyHookAddress}`);
  console.log(`  PubKey:   ${teeService.publicKeyHex.slice(0, 20)}...`);
  console.log(`  Ready!\n`);
});
