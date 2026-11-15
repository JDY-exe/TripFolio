import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useUpdateExpense,
  expensesQueryKey,
  balancesQueryKey,
  type Expense,
} from '../../src/queries/ledger';
import { patchToApi } from '../../src/utils/api';

vi.mock('../../src/utils/api', () => ({
  getFromApi: vi.fn(),
  postToApi: vi.fn(),
  patchToApi: vi.fn(),
}));

const original: Expense = {
  _id: 'expense-1',
  tripId: 'trip-1',
  eventId: 'event-1',
  description: 'Dinner',
  amount: 96,
  paidBy: 'owner',
  splitAmong: ['owner', 'maya'],
};

/** Captures the real mutation hook under an isolated cache without a browser.
 * @param client - Query client used by this test.
 * @returns The mutation result, which can be submitted directly.
 */
const captureMutation = (client: QueryClient) => {
  let mutation: ReturnType<typeof useUpdateExpense>;
  const Probe = () => {
    mutation = useUpdateExpense();
    return null;
  };
  renderToString(
    createElement(QueryClientProvider, { client }, createElement(Probe)),
  );
  return mutation!;
};

afterEach(() => vi.resetAllMocks());

describe('expense updates', () => {
  it('updates the matching card and refreshes balances and linked event costs', async () => {
    const client = new QueryClient();
    const other = { ...original, _id: 'expense-2' };
    const saved = { ...original, amount: 128, splitAmong: ['maya'] };
    client.setQueryData(expensesQueryKey(original.tripId), [original, other]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(patchToApi).mockResolvedValue(saved);
    try {
      const { description, amount, paidBy, splitAmong } = saved;
      const draft = { description, amount, paidBy, splitAmong };
      await captureMutation(client).mutateAsync({
        expenseId: original._id,
        tripId: original.tripId,
        eventId: original.eventId,
        draft,
      });
      expect(patchToApi).toHaveBeenCalledWith(
        '/api/ledger/expenses/expense-1',
        draft,
      );
      expect(client.getQueryData(expensesQueryKey(original.tripId))).toEqual([
        saved,
        other,
      ]);
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: balancesQueryKey(original.tripId),
      });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events'] });
    } finally {
      client.clear();
    }
  });

  it('retains cached expenses on failure and does not retry the write automatically', async () => {
    const client = new QueryClient();
    client.setQueryData(expensesQueryKey(original.tripId), [original]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(patchToApi).mockRejectedValue(new Error('Save failed'));
    try {
      await expect(
        captureMutation(client).mutateAsync({
          expenseId: original._id,
          tripId: original.tripId,
          draft: original,
        }),
      ).rejects.toThrow('Save failed');
      expect(client.getQueryData(expensesQueryKey(original.tripId))).toEqual([
        original,
      ]);
      expect(patchToApi).toHaveBeenCalledTimes(1);
      expect(invalidate).not.toHaveBeenCalled();
    } finally {
      client.clear();
    }
  });
});
