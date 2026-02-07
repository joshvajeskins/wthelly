import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { TeeAttestationService } from './tee-attestation.js';
import { BetStore } from './bet-store.js';
import { computeSettlement } from './settlement.js';
import { ClearnodeBridge } from './clearnode-bridge.js';
import { AppSessionHandler } from './app-session-handler.js';

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

    let result;

    // Settle via state channel if requested and bridge is available
    if (req.query.channel === 'true' && bridge?.isAuthenticated) {
      const { settleViaStateChannel } = await import('./settlement.js');
      result = await settleViaStateChannel(marketId, outcome, betStore, bridge);
    } else {
      result = await computeSettlement(marketId, outcome, betStore);
    }

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

// Initialize Clearnode bridge
let bridge: ClearnodeBridge | null = null;
let sessionHandler: AppSessionHandler | null = null;

async function initClearnodeBridge() {
  try {
    bridge = new ClearnodeBridge(config.clearnodeWsUrl, teeService);
    sessionHandler = new AppSessionHandler(bridge, betStore, teeService, config);
    bridge.onNotification((notification) => {
      sessionHandler!.handleNotification(notification).catch(err => {
        console.error('[Bridge] Notification handler error:', err);
      });
    });
    await bridge.connect();
    console.log('[Clearnode] Bridge connected and authenticated');
  } catch (error) {
    console.warn('[Clearnode] Bridge connection failed (will retry):', error);
    // Server continues without Clearnode — HTTP endpoints still work
  }
}

app.listen(config.port, async () => {
  console.log(`\n[wthelly TEE Server]`);
  console.log(`  Mode:     ${config.teeMode}`);
  console.log(`  Port:     ${config.port}`);
  console.log(`  Chain:    ${config.chainId}`);
  console.log(`  Contract: ${config.hellyHookAddress}`);
  console.log(`  PubKey:   ${teeService.publicKeyHex.slice(0, 20)}...`);

  // Connect to Clearnode in background
  await initClearnodeBridge();

  console.log(`  Ready!\n`);
});
