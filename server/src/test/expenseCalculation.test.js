import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplits,
  validateAndFormatCustomSplits,
  calculateTripBalances,
  simplifyDebts,
} from '../services/expenseCalculationService.js';

describe('Expense Calculation Service', () => {
  describe('calculateEqualSplits', () => {
    it('divides amount equally when perfectly divisible', () => {
      const participants = ['userB', 'userA', 'userC'];
      const splits = calculateEqualSplits(3000, participants); // $30.00 among 3

      expect(splits).toHaveLength(3);
      expect(splits.every((s) => s.amount === 1000)).toBe(true);
      const total = splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(3000);
    });

    it('distributes remainder cents deterministically to ensure exact sum', () => {
      // $100.00 (10000 minor units) among 3 people:
      // 10000 / 3 = 3333 with remainder 1.
      const participants = ['userZ', 'userA', 'userM'];
      const splits = calculateEqualSplits(10000, participants);

      expect(splits).toHaveLength(3);
      // Sorted alphabetically: userA gets 3334, userM gets 3333, userZ gets 3333
      expect(splits.find((s) => s.user === 'userA').amount).toBe(3334);
      expect(splits.find((s) => s.user === 'userM').amount).toBe(3333);
      expect(splits.find((s) => s.user === 'userZ').amount).toBe(3333);

      const total = splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(10000);
    });

    it('handles remainder of 2 among 3 participants deterministically', () => {
      // 10001 / 3 = 3333 with remainder 2
      const splits = calculateEqualSplits(10001, ['user2', 'user1', 'user3']);
      const total = splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(10001);
      // user1 and user2 get 3334, user3 gets 3333
      expect(splits.find((s) => s.user === 'user1').amount).toBe(3334);
      expect(splits.find((s) => s.user === 'user2').amount).toBe(3334);
      expect(splits.find((s) => s.user === 'user3').amount).toBe(3333);
    });

    it('throws error when amount is not a positive integer', () => {
      expect(() => calculateEqualSplits(-500, ['u1'])).toThrow(/positive integer/i);
      expect(() => calculateEqualSplits(12.5, ['u1'])).toThrow(/positive integer/i);
      expect(() => calculateEqualSplits(0, ['u1'])).toThrow(/positive integer/i);
    });

    it('throws error when participants list is empty', () => {
      expect(() => calculateEqualSplits(1000, [])).toThrow(/at least one participant/i);
    });
  });

  describe('validateAndFormatCustomSplits', () => {
    it('accepts custom splits that exactly equal total amount', () => {
      const rawSplits = [
        { user: 'userA', amount: 2500 },
        { user: 'userB', amount: 1500 },
        { user: 'userC', amount: 1000 },
      ];
      const validated = validateAndFormatCustomSplits(5000, rawSplits);
      expect(validated).toHaveLength(3);
      expect(validated.reduce((sum, s) => sum + s.amount, 0)).toBe(5000);
    });

    it('rejects custom splits when sum does not equal total amount', () => {
      const rawSplits = [
        { user: 'userA', amount: 2000 },
        { user: 'userB', amount: 2000 },
      ];
      expect(() => validateAndFormatCustomSplits(5000, rawSplits)).toThrow(/does not equal total/i);
    });

    it('rejects negative or fractional split amounts', () => {
      const rawSplits = [
        { user: 'userA', amount: -500 },
        { user: 'userB', amount: 1500 },
      ];
      expect(() => validateAndFormatCustomSplits(1000, rawSplits)).toThrow(/non-negative integer/i);
    });

    it('rejects duplicate participants in splits', () => {
      const rawSplits = [
        { user: 'userA', amount: 2500 },
        { user: 'userA', amount: 2500 },
      ];
      expect(() => validateAndFormatCustomSplits(5000, rawSplits)).toThrow(/duplicate participant/i);
    });
  });

  describe('calculateTripBalances & Zero-Sum Invariant', () => {
    const alice = { _id: 'alice', name: 'Alice' };
    const bob = { _id: 'bob', name: 'Bob' };
    const charlie = { _id: 'charlie', name: 'Charlie' };
    const members = [{ user: alice }, { user: bob }, { user: charlie }];

    it('computes correct balances for simple equal split expense', () => {
      // Alice pays $90 (9000 minor units) for dinner, split equally among Alice, Bob, Charlie (3000 each)
      const expenses = [
        {
          _id: 'exp1',
          amount: 9000,
          paidBy: 'alice',
          type: 'expense',
          splits: [
            { user: 'alice', amount: 3000 },
            { user: 'bob', amount: 3000 },
            { user: 'charlie', amount: 3000 },
          ],
        },
      ];

      const { totalSpent, memberLedgers } = calculateTripBalances(members, expenses, []);

      expect(totalSpent).toBe(9000);

      const aliceLedger = memberLedgers.find((m) => m.user._id === 'alice');
      const bobLedger = memberLedgers.find((m) => m.user._id === 'bob');
      const charlieLedger = memberLedgers.find((m) => m.user._id === 'charlie');

      // Alice paid 9000, her share was 3000 => net +6000 (receives 6000)
      expect(aliceLedger.netBalance).toBe(6000);
      expect(aliceLedger.status).toBe('receives');

      // Bob paid 0, his share was 3000 => net -3000 (owes 3000)
      expect(bobLedger.netBalance).toBe(-3000);
      expect(bobLedger.status).toBe('owes');

      // Charlie paid 0, his share was 3000 => net -3000 (owes 3000)
      expect(charlieLedger.netBalance).toBe(-3000);
      expect(charlieLedger.status).toBe('owes');

      // Zero-sum invariant: 6000 + (-3000) + (-3000) = 0
      const sum = memberLedgers.reduce((acc, m) => acc + m.netBalance, 0);
      expect(sum).toBe(0);
    });

    it('handles partial settlements correctly', () => {
      const expenses = [
        {
          _id: 'exp1',
          amount: 6000,
          paidBy: 'alice',
          type: 'expense',
          splits: [
            { user: 'alice', amount: 3000 },
            { user: 'bob', amount: 3000 },
          ],
        },
      ];

      // Bob owes Alice 3000. Bob makes a partial settlement of 1000 to Alice.
      const settlements = [
        {
          _id: 'set1',
          payer: 'bob',
          payee: 'alice',
          amount: 1000,
        },
      ];

      const { memberLedgers, totalSettled } = calculateTripBalances(
        [{ user: alice }, { user: bob }],
        expenses,
        settlements
      );

      expect(totalSettled).toBe(1000);

      const aliceLedger = memberLedgers.find((m) => m.user._id === 'alice');
      const bobLedger = memberLedgers.find((m) => m.user._id === 'bob');

      // Alice: was owed 3000, received 1000 => net +2000
      expect(aliceLedger.netBalance).toBe(2000);

      // Bob: owed 3000, paid 1000 => net -2000
      expect(bobLedger.netBalance).toBe(-2000);

      // Zero-sum invariant
      expect(aliceLedger.netBalance + bobLedger.netBalance).toBe(0);
    });

    it('correctly handles full settlement leaving all parties at zero', () => {
      const expenses = [
        {
          _id: 'exp1',
          amount: 4000,
          paidBy: 'alice',
          type: 'expense',
          splits: [
            { user: 'alice', amount: 2000 },
            { user: 'bob', amount: 2000 },
          ],
        },
      ];

      // Bob pays Alice full 2000
      const settlements = [
        {
          _id: 'set1',
          payer: 'bob',
          payee: 'alice',
          amount: 2000,
        },
      ];

      const { memberLedgers } = calculateTripBalances(
        [{ user: alice }, { user: bob }],
        expenses,
        settlements
      );

      const aliceLedger = memberLedgers.find((m) => m.user._id === 'alice');
      const bobLedger = memberLedgers.find((m) => m.user._id === 'bob');

      expect(aliceLedger.netBalance).toBe(0);
      expect(aliceLedger.status).toBe('settled');
      expect(bobLedger.netBalance).toBe(0);
      expect(bobLedger.status).toBe('settled');
    });

    it('handles merchant/group refunds where supported', () => {
      // Alice paid 9000 for 3 people (3000 each)
      const expenses = [
        {
          _id: 'exp1',
          amount: 9000,
          paidBy: 'alice',
          type: 'expense',
          splits: [
            { user: 'alice', amount: 3000 },
            { user: 'bob', amount: 3000 },
            { user: 'charlie', amount: 3000 },
          ],
        },
        // A 3000 refund is returned to Alice, reducing everyone's share by 1000
        {
          _id: 'refund1',
          amount: 3000,
          paidBy: 'alice',
          type: 'refund',
          splits: [
            { user: 'alice', amount: 1000 },
            { user: 'bob', amount: 1000 },
            { user: 'charlie', amount: 1000 },
          ],
        },
      ];

      const { totalSpent, memberLedgers } = calculateTripBalances(members, expenses, []);

      // Total spent was 9000 - 3000 = 6000
      expect(totalSpent).toBe(6000);

      const aliceLedger = memberLedgers.find((m) => m.user._id === 'alice');
      const bobLedger = memberLedgers.find((m) => m.user._id === 'bob');
      const charlieLedger = memberLedgers.find((m) => m.user._id === 'charlie');

      // Alice net: (9000 - 3000 paid = 6000) - (3000 - 1000 share = 2000) = +4000
      expect(aliceLedger.netBalance).toBe(4000);

      // Bob net: (0) - (3000 - 1000 share = 2000) = -2000
      expect(bobLedger.netBalance).toBe(-2000);

      // Charlie net: -2000
      expect(charlieLedger.netBalance).toBe(-2000);

      // Invariant: 4000 + (-2000) + (-2000) = 0
      const sum = memberLedgers.reduce((acc, m) => acc + m.netBalance, 0);
      expect(sum).toBe(0);
    });

    it('simplifies debts to minimum optimal transactions', () => {
      // Alice: +6000
      // Bob: -4000
      // Charlie: -2000
      const ledgers = [
        { user: alice, netBalance: 6000 },
        { user: bob, netBalance: -4000 },
        { user: charlie, netBalance: -2000 },
      ];

      const transactions = simplifyDebts(ledgers);

      expect(transactions).toHaveLength(2);
      expect(transactions).toContainEqual({
        from: bob,
        to: alice,
        amount: 4000,
      });
      expect(transactions).toContainEqual({
        from: charlie,
        to: alice,
        amount: 2000,
      });
    });
  });
});
