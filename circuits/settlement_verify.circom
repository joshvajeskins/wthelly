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
    // Equivalently: active[i+1] * (1 - active[i]) === 0 for i in [0, MAX_BETS-2]
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
    // Compute winner and loser pools
    var winnerPool = 0;
    var loserPool = 0;
    var sumPayouts = 0;
    var sumAmounts = 0;

    // isWinner[i] = 1 if bet is on winning side
    signal isWinner[MAX_BETS];
    for (var i = 0; i < MAX_BETS; i++) {
        // isWinner = 1 when direction matches outcome
        // direction=1,outcome=1 -> match(1). direction=0,outcome=0 -> match(1)
        // direction=1,outcome=0 -> no match(0). direction=0,outcome=1 -> no match(0)
        // isWinner = 1 - (direction - outcome)^2 = 1 - direction^2 + 2*direction*outcome - outcome^2
        // Since direction and outcome are binary: direction^2=direction, outcome^2=outcome
        // isWinner = 1 - direction - outcome + 2*direction*outcome
        isWinner[i] <== 1 - directions[i] - outcome + 2 * directions[i] * outcome;

        winnerPool += isWinner[i] * amounts[i];
        loserPool += (1 - isWinner[i]) * amounts[i];
        sumPayouts += payouts[i];
        sumAmounts += amounts[i];
    }

    // ---- Constraint 5: totalPool matches sum of amounts ----
    sumAmounts === totalPool;

    // ---- Constraint 6: Fee correctness ----
    // platformFee * 10000 === loserPool * feeBps
    platformFee * 10000 === loserPool * feeBps;

    // ---- Constraint 7: Conservation ----
    // sum(payouts) + platformFee === totalPool
    sumPayouts + platformFee === totalPool;

    // ---- Constraint 8: Losers get zero payout ----
    for (var i = 0; i < MAX_BETS; i++) {
        (1 - isWinner[i]) * payouts[i] === 0;
    }

    // ---- Constraint 9: Proportional winner payouts ----
    // For any two slots i,j: payouts[i] * amounts[j] === payouts[j] * amounts[i]
    // For non-winners, payouts are already constrained to 0, so the equation
    // is trivially 0===0. We can check ALL pairs without filtering.
    for (var i = 0; i < MAX_BETS; i++) {
        for (var j = i + 1; j < MAX_BETS; j++) {
            payouts[i] * amounts[j] === payouts[j] * amounts[i];
        }
    }
}

component main {public [outcome, feeBps, totalPool, platformFee]} = SettlementVerify(32);
