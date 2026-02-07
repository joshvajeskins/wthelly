import type { ClearnodeBridge } from './clearnode-bridge.js';
import type { BetStore, DecryptedBet } from './bet-store.js';
import type { TeeAttestationService } from './tee-attestation.js';
import type { BalanceTracker } from './balance-tracker.js';
import type { ChainClient } from './chain-client.js';
import { decryptBetData } from './ecies.js';
import type { config as Config } from './config.js';

export class AppSessionHandler {
  constructor(
    private bridge: ClearnodeBridge,
    private betStore: BetStore,
    private teeService: TeeAttestationService,
    private config: typeof Config,
    private balanceTracker?: BalanceTracker,
    private chainClient?: ChainClient
  ) {}

  async handleNotification(notification: any): Promise<void> {
    // Determine notification type from the data structure
    const appSession = notification.appSession || notification;
    const status = appSession.status;

    if (status === 'open' && (!appSession.version || appSession.version === 1)) {
      // New app session created
      await this.handleNewSession(appSession, notification.participantAllocations);
    } else if (appSession.sessionData) {
      // State update (bet placement)
      await this.handleStateUpdate(appSession, notification.participantAllocations);
    }
  }

  private async handleNewSession(session: any, allocations: any[]): Promise<void> {
    // Validate app definition matches wthelly-market-*
    const appDef = session.application || session.appDefinition || '';
    if (!appDef.startsWith('wthelly-market-')) {
      console.log(`[AppSession] Ignoring non-wthelly session: ${appDef}`);
      return;
    }

    const marketId = appDef.replace('wthelly-market-', '');
    console.log(`[AppSession] New session for market ${marketId.slice(0, 10)}...`);
    // TEE co-signs by default for valid sessions
  }

  private async handleStateUpdate(session: any, allocations: any[]): Promise<void> {
    // This is a bet placement or state transition
    const sessionData =
      typeof session.sessionData === 'string'
        ? JSON.parse(session.sessionData)
        : session.sessionData;

    // Decrypt ECIES-encrypted bet data if present
    if (sessionData.encryptedBet) {
      try {
        this.teeService.incrementMetric('betsReceived');
        const betData = decryptBetData(this.teeService.getPrivateKey(), sessionData.encryptedBet);

        const betAmount = BigInt(betData.amount);

        // --- Validation: check market is open on-chain ---
        if (this.chainClient) {
          const open = await this.chainClient.isMarketOpen(betData.marketId);
          if (!open) {
            console.warn(
              `[AppSession] Rejected bet: market ${betData.marketId.slice(0, 10)}... is closed/resolved`
            );
            return; // TEE doesn't co-sign → state doesn't advance
          }
        }

        // --- Validation: check user has sufficient available balance ---
        if (this.balanceTracker && allocations?.length) {
          // Extract user's Clearnode balance from participant allocations
          const userAlloc = allocations.find(
            (a: any) => a.participant?.toLowerCase() === betData.address?.toLowerCase()
          );
          const clearnodeBalance = userAlloc ? BigInt(userAlloc.amount || '0') : 0n;

          if (!this.balanceTracker.canPlaceBet(betData.address, clearnodeBalance, betAmount)) {
            console.warn(
              `[AppSession] Rejected bet: insufficient balance for ${betData.address.slice(0, 10)}... ` +
              `(clearnode=${clearnodeBalance}, locked=${this.balanceTracker.getLockedAmount(betData.address)}, bet=${betAmount})`
            );
            return; // TEE doesn't co-sign
          }
        }

        const bet: DecryptedBet = {
          marketId: betData.marketId,
          isYes: betData.isYes,
          amount: betAmount,
          secret: betData.secret || '',
          address: betData.address,
          commitHash: '',
          timestamp: Date.now(),
        };

        this.betStore.addBet(bet);
        this.teeService.incrementMetric('betsDecrypted');

        // Lock funds in balance tracker
        if (this.balanceTracker) {
          this.balanceTracker.lockBet(betData.address, betData.marketId, betAmount);
        }

        console.log(
          `[AppSession] Bet recorded: market=${betData.marketId.slice(0, 10)}... direction=${betData.isYes ? 'YES' : 'NO'}`
        );
      } catch (error) {
        console.error(`[AppSession] Failed to decrypt bet data:`, error);
        this.teeService.incrementMetric('betsFailed');
      }
    }
  }
}
