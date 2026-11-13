import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFromApi, postToApi } from '../utils/api';

export interface Expense {
  _id: string;
  tripId: string;
  eventId?: string | null;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
}

export interface LedgerBalance {
  owerId: string;
  oweeId: string;
  amount: number;
}

export type CreateExpenseInput = Omit<Expense, '_id'>;

/** Builds the expense cache key for a trip.
 * @param tripId - Trip whose expenses are cached.
 * @returns The trip's expense query key.
 */
export const expensesQueryKey = (tripId: string) =>
  ['expenses', tripId] as const;

/** Builds the settlement cache key for a trip.
 * @param tripId - Trip whose settlements are cached.
 * @returns The trip's balance query key.
 */
export const balancesQueryKey = (tripId: string) =>
  ['balances', tripId] as const;

/** Fetches a trip's expenses through the authenticated transport.
 * @param tripId - Trip identifier; fetching is disabled when absent.
 * @returns The expense query, including loading, error, and retry state.
 */
export const useExpenses = (tripId?: string) =>
  useQuery({
    queryKey: expensesQueryKey(tripId ?? ''),
    queryFn: () => getFromApi<Expense[]>(`/api/ledger/expenses/${tripId}`),
    enabled: Boolean(tripId),
  });

/** Fetches a trip's current settlements through the authenticated transport.
 * @param tripId - Trip identifier; fetching is disabled when absent.
 * @returns The balance query, including loading and retry state.
 */
export const useBalances = (tripId?: string) =>
  useQuery({
    queryKey: balancesQueryKey(tripId ?? ''),
    queryFn: () =>
      getFromApi<LedgerBalance[]>(`/api/ledger/${tripId}/balances`),
    enabled: Boolean(tripId),
  });

/** Creates an expense and refreshes expenses, settlements, and linked event costs.
 * @returns A mutation accepting a complete expense draft; errors retain the draft in its form.
 */
export const useCreateExpense = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      postToApi<Expense, CreateExpenseInput>('/api/ledger/expenses', input),
    onSuccess: async (expense, input) => {
      client.setQueryData<Expense[]>(
        expensesQueryKey(input.tripId),
        (current) => [
          ...(current ?? []).filter((item) => item._id !== expense._id),
          expense,
        ],
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: expensesQueryKey(input.tripId) }),
        client.invalidateQueries({ queryKey: balancesQueryKey(input.tripId) }),
        ...(input.eventId
          ? [client.invalidateQueries({ queryKey: ['events'] })]
          : []),
      ]);
    },
    retry: 0,
  });
};
