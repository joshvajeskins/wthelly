import type { ClearnodeBridge } from './clearnode-bridge.js';
import type { BetStore, DecryptedBet } from './bet-store.js';
import type { TeeAttestationService } from './tee-attestation.js';
import { decryptBetData } from './ecies.js';
import type { config as Config } from './config.js';

export class AppSessionHandler {
  constructor(
    private bridge: ClearnodeBridge,
    private betStore: BetStore,
    private teeService: TeeAttestationService,
    private config: typeof Config
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
        const betData = decryptBetData(this.teeService.getPrivateKey(), sessionData.encryptedBet);

        const bet: DecryptedBet = {
          marketId: betData.marketId,
          isYes: betData.isYes,
          amount: BigInt(betData.amount),
          secret: betData.secret || '',
          address: betData.address,
          commitHash: '',
          timestamp: Date.now(),
        };

        this.betStore.addBet(bet);
        this.teeService.incrementMetric('betsReceived');
        this.teeService.incrementMetric('betsDecrypted');

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
