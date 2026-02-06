pragma circom 2.0.0;

template SettlementVerify(MAX_BETS) {
    // Public signals
    signal input outcome;      // 0 = NO won, 1 = YES won
    signal input feeBps;       // Platform fee basis points (e.g., 200 = 2%)
    signal input totalPool;    // Total amount bet
    signal input platformFee;  // Computed platform fee amount

    // Private signals (known only to TEE)
    signal input numBets;              // Actual number of bets
    signal input directions[MAX_BETS]; // 0 = NO, 1 = YES
    signal input amounts[MAX_BETS];    // Bet amounts per slot
    signal input payouts[MAX_BETS];    // Computed payout per slot
    signal input active[MAX_BETS];     // 1 if slot is used, 0 if not

    // ---- Constraint 0: outcome is binary ----
    outcome * (outcome - 1) === 0;

    // ---- Constraint 1: active flags are binary and contiguous ----
    var sumActive = 0;
    for (var i = 0; i < MAX_BETS; i++) {
        active[i] * (active[i] - 1) === 0;
        sumActive += active[i];
    }
    sumActive === numBets;

    // No gaps: if active[i] = 0 then active[i+1] must also be 0
    for (var i = 0; i < MAX_BETS - 1; i++) {
        active[i + 1] * (1 - active[i]) === 0;
    }

    // ---- Constraint 2: directions are binary ----
    for (var i = 0; i < MAX_BETS; i++) {
        directions[i] * (directions[i] - 1) === 0;
    }

    // ---- Constraint 3: inactive slots are zeroed ----
    for (var i = 0; i < MAX_BETS; i++) {
        (1 - active[i]) * directions[i] === 0;
        (1 - active[i]) * amounts[i] === 0;
        (1 - active[i]) * payouts[i] === 0;
    }

    // ---- Constraint 4: Pool classification ----
    // isWinner[i] = 1 when direction matches outcome
    // isWinner = 1 - direction - outcome + 2*direction*outcome
    signal isWinner[MAX_BETS];

    // Intermediate signals for quadratic products (required for R1CS)
    signal winAmount[MAX_BETS];
    signal loseAmount[MAX_BETS];

    var sumPayouts = 0;
    var sumAmounts = 0;
    var winnerPoolVar = 0;
    var loserPoolVar = 0;

    for (var i = 0; i < MAX_BETS; i++) {
        isWinner[i] <== 1 - directions[i] - outcome + 2 * directions[i] * outcome;

        // Capture quadratic products as intermediate signals
        winAmount[i] <== isWinner[i] * amounts[i];
        loseAmount[i] <== amounts[i] - winAmount[i];

        winnerPoolVar += winAmount[i];
        loserPoolVar += loseAmount[i];
        sumPayouts += payouts[i];
        sumAmounts += amounts[i];
    }

    // ---- Constraint 5: totalPool matches sum of amounts ----
    sumAmounts === totalPool;

    // ---- Constraint 6: Fee correctness ----
    // Need loserPool as a signal for the quadratic constraint
    signal loserPoolSig;
    loserPoolSig <== loserPoolVar;
    loserPoolSig * feeBps === platformFee * 10000;

    // ---- Constraint 7: Conservation ----
    sumPayouts + platformFee === totalPool;

    // ---- Constraint 8: Losers get zero payout ----
    for (var i = 0; i < MAX_BETS; i++) {
        (1 - isWinner[i]) * payouts[i] === 0;
    }

    // ---- Constraint 9: Proportional winner payouts ----
    // Use winAmount instead of amounts so loser slots (winAmount=0) don't break the check.
    // Winner i, Winner j: payouts[i]*winAmount[j] === payouts[j]*winAmount[i] ✓
    // Winner i, Loser j:  payouts[i]*0 === 0*winAmount[i] → 0===0 ✓
    // Loser i, Loser j:   0*0 === 0*0 → 0===0 ✓
    signal cross[MAX_BETS * (MAX_BETS - 1) / 2];
    var pairIdx = 0;
    for (var i = 0; i < MAX_BETS; i++) {
        for (var j = i + 1; j < MAX_BETS; j++) {
            cross[pairIdx] <== payouts[i] * winAmount[j];
            cross[pairIdx] === payouts[j] * winAmount[i];
            pairIdx++;
        }
    }
}

component main {public [outcome, feeBps, totalPool, platformFee]} = SettlementVerify(32);
