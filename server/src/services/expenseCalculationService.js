/**
 * Authoritative Expense & Debt Calculation Service
 *
 * Implements deterministic integer minor-unit financial calculations:
 * - Equal split calculation with remainder distribution
 * - Custom split verification (exact sum matching)
 * - Net member balance calculations (authoritative ledger)
 * - Debt simplification (optimal who-owes-whom payment graph)
 * - Zero-sum invariant verification
 */

/**
 * Deterministically splits a total integer minor-unit amount equally among participants.
 * Any remainder cents/paise are distributed 1 unit each to the first (remainder) participants
 * sorted alphabetically by user ID to ensure deterministic reproducibility.
 *
 * @param {number} totalAmountMinor - Total amount in minor units (e.g. cents/paise), must be integer > 0
 * @param {string[]} participantUserIds - Array of user ID strings
 * @returns {Array<{ user: string, amount: number }>}
 */
export function calculateEqualSplits(totalAmountMinor, participantUserIds) {
  if (!Number.isInteger(totalAmountMinor) || totalAmountMinor <= 0) {
    throw new Error('Total amount must be a positive integer in minor units');
  }

  if (!Array.isArray(participantUserIds) || participantUserIds.length === 0) {
    throw new Error('At least one participant is required for an equal split');
  }

  // Deduplicate and deterministically sort participant IDs
  const uniqueIds = Array.from(new Set(participantUserIds.map((id) => String(id)))).sort();
  const count = uniqueIds.length;

  const baseShare = Math.floor(totalAmountMinor / count);
  const remainder = totalAmountMinor % count;

  return uniqueIds.map((userId, index) => ({
    user: userId,
    amount: index < remainder ? baseShare + 1 : baseShare,
  }));
}

/**
 * Validates custom split amounts and ensures their sum equals the total amount exactly.
 *
 * @param {number} totalAmountMinor - Total amount in minor units, must be integer > 0
 * @param {Array<{ user: string, amount: number }>} splits - Array of participant splits
 * @returns {Array<{ user: string, amount: number }>}
 */
export function validateAndFormatCustomSplits(totalAmountMinor, splits) {
  if (!Number.isInteger(totalAmountMinor) || totalAmountMinor <= 0) {
    throw new Error('Total amount must be a positive integer in minor units');
  }

  if (!Array.isArray(splits) || splits.length === 0) {
    throw new Error('Custom splits must contain at least one participant');
  }

  const seenUsers = new Set();
  let splitsSum = 0;

  const formattedSplits = splits.map((s) => {
    if (!s.user) {
      throw new Error('Each custom split must specify a participant user');
    }

    const userId = String(s.user);
    if (seenUsers.has(userId)) {
      throw new Error(`Duplicate participant detected in splits: ${userId}`);
    }
    seenUsers.add(userId);

    const splitAmount = Number(s.amount);
    if (!Number.isInteger(splitAmount) || splitAmount < 0) {
      throw new Error(`Split amount for participant ${userId} must be a non-negative integer`);
    }

    splitsSum += splitAmount;
    return {
      user: userId,
      amount: splitAmount,
    };
  });

  if (splitsSum !== totalAmountMinor) {
    throw new Error(
      `Custom splits sum (${splitsSum}) does not equal total amount (${totalAmountMinor}). Discrepancy: ${
        splitsSum - totalAmountMinor
      } minor units`
    );
  }

  return formattedSplits;
}

/**
 * Calculates authoritative trip member balances, total spending, and simplified settlements.
 *
 * @param {Array<Object>} members - Trip members with user details
 * @param {Array<Object>} expenses - Authoritative expense documents
 * @param {Array<Object>} settlements - Authoritative settlement documents
 * @returns {Object} { totalSpent, totalSettled, netBalances, suggestedSettlements, memberLedgers }
 */
export function calculateTripBalances(members = [], expenses = [], settlements = []) {
  const ledgerMap = new Map();

  // Initialize ledgers for all known trip members
  members.forEach((m) => {
    const userObj = m.user || m;
    const userId = String(userObj._id || userObj.id || userObj);
    ledgerMap.set(userId, {
      user: {
        _id: userId,
        name: userObj.name || 'Traveler',
        email: userObj.email || '',
        avatar: userObj.avatar || '',
      },
      totalPaid: 0,
      totalShare: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      netBalance: 0,
    });
  });

  let totalSpent = 0;
  let totalSettled = 0;

  // 1. Process Expenses & Refunds
  expenses.forEach((expense) => {
    const isRefund = expense.type === 'refund';
    const amount = Number(expense.amount) || 0;
    const payerId = String(expense.paidBy?._id || expense.paidBy);

    if (isRefund) {
      totalSpent -= amount;
    } else {
      totalSpent += amount;
    }

    // Ensure payer exists in ledger
    if (!ledgerMap.has(payerId)) {
      ledgerMap.set(payerId, {
        user: { _id: payerId, name: expense.paidBy?.name || 'Traveler', email: '', avatar: '' },
        totalPaid: 0,
        totalShare: 0,
        settlementsPaid: 0,
        settlementsReceived: 0,
        netBalance: 0,
      });
    }

    const payerLedger = ledgerMap.get(payerId);
    if (isRefund) {
      payerLedger.totalPaid -= amount;
    } else {
      payerLedger.totalPaid += amount;
    }

    // Process splits
    (expense.splits || []).forEach((split) => {
      const splitUserId = String(split.user?._id || split.user);
      const splitAmount = Number(split.amount) || 0;

      if (!ledgerMap.has(splitUserId)) {
        ledgerMap.set(splitUserId, {
          user: { _id: splitUserId, name: split.user?.name || 'Traveler', email: '', avatar: '' },
          totalPaid: 0,
          totalShare: 0,
          settlementsPaid: 0,
          settlementsReceived: 0,
          netBalance: 0,
        });
      }

      const splitLedger = ledgerMap.get(splitUserId);
      if (isRefund) {
        splitLedger.totalShare -= splitAmount;
      } else {
        splitLedger.totalShare += splitAmount;
      }
    });
  });

  // 2. Process Settlements
  settlements.forEach((settlement) => {
    // Only count completed settlements towards balances (skip pending/failed/refunded)
    if (settlement.status && settlement.status !== 'completed') {
      return;
    }

    const amount = Number(settlement.amount) || 0;
    const payerId = String(settlement.payer?._id || settlement.payer);
    const payeeId = String(settlement.payee?._id || settlement.payee);

    totalSettled += amount;

    if (!ledgerMap.has(payerId)) {
      ledgerMap.set(payerId, {
        user: { _id: payerId, name: settlement.payer?.name || 'Traveler', email: '', avatar: '' },
        totalPaid: 0,
        totalShare: 0,
        settlementsPaid: 0,
        settlementsReceived: 0,
        netBalance: 0,
      });
    }

    if (!ledgerMap.has(payeeId)) {
      ledgerMap.set(payeeId, {
        user: { _id: payeeId, name: settlement.payee?.name || 'Traveler', email: '', avatar: '' },
        totalPaid: 0,
        totalShare: 0,
        settlementsPaid: 0,
        settlementsReceived: 0,
        netBalance: 0,
      });
    }

    ledgerMap.get(payerId).settlementsPaid += amount;
    ledgerMap.get(payeeId).settlementsReceived += amount;
  });

  // 3. Compute Net Balance for each member
  // Net = (totalPaid - totalShare) + (settlementsPaid - settlementsReceived)
  const memberLedgers = [];
  let netSum = 0;

  ledgerMap.forEach((ledger) => {
    ledger.netBalance =
      ledger.totalPaid - ledger.totalShare + (ledger.settlementsPaid - ledger.settlementsReceived);
    netSum += ledger.netBalance;

    ledger.status =
      ledger.netBalance > 0 ? 'receives' : ledger.netBalance < 0 ? 'owes' : 'settled';

    memberLedgers.push(ledger);
  });

  // Verify zero-sum invariant
  if (netSum !== 0) {
    console.warn(`[ExpenseCalculation] Non-zero balance sum detected: ${netSum} minor units`);
  }

  // 4. Calculate simplified debt graph (who owes whom)
  const suggestedSettlements = simplifyDebts(memberLedgers);

  return {
    totalSpent: Math.max(0, totalSpent),
    totalSettled,
    memberLedgers,
    suggestedSettlements,
  };
}

/**
 * Greedy debt settlement simplification algorithm.
 * Reduces the number of peer-to-peer transactions required to settle all debts.
 *
 * @param {Array<Object>} memberLedgers
 * @returns {Array<{ from: Object, to: Object, amount: number }>}
 */
export function simplifyDebts(memberLedgers) {
  // Debtors have negative net balance (they owe money)
  const debtors = memberLedgers
    .filter((m) => m.netBalance < 0)
    .map((m) => ({ user: m.user, amountOwed: -m.netBalance }))
    .sort((a, b) => b.amountOwed - a.amountOwed);

  // Creditors have positive net balance (they are owed money)
  const creditors = memberLedgers
    .filter((m) => m.netBalance > 0)
    .map((m) => ({ user: m.user, amountReceivable: m.netBalance }))
    .sort((a, b) => b.amountReceivable - a.amountReceivable);

  const transactions = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.amountOwed, creditor.amountReceivable);

    if (settleAmount > 0) {
      transactions.push({
        from: debtor.user,
        to: creditor.user,
        amount: settleAmount,
      });

      debtor.amountOwed -= settleAmount;
      creditor.amountReceivable -= settleAmount;
    }

    if (debtor.amountOwed === 0) dIdx++;
    if (creditor.amountReceivable === 0) cIdx++;
  }

  return transactions;
}

export default {
  calculateEqualSplits,
  validateAndFormatCustomSplits,
  calculateTripBalances,
  simplifyDebts,
};
