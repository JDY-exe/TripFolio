import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFromApi, patchToApi, postToApi } from '../utils/api';
import type { QueryClient } from '@tanstack/react-query';

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
export type ExpenseDraft = Pick<
  Expense,
  'description' | 'amount' | 'paidBy' | 'splitAmong'
>;

interface UpdateExpenseInput {
  expenseId: string;
  tripId: string;
  eventId?: string | null;
  draft: ExpenseDraft;
}

/** Refreshes every server-state consumer affected by creating or editing an expense.
 * @param client - Shared query client.
 * @param tripId - Trip whose expense and balance queries should refresh.
 * @param eventId - Optional linked event whose cost also changed.
 * @returns A promise for all applicable cache invalidations.
 */
const refreshLedger = (
  client: QueryClient,
  tripId: string,
  eventId?: string | null,
) =>
  Promise.all([
    client.invalidateQueries({ queryKey: expensesQueryKey(tripId) }),
    client.invalidateQueries({ queryKey: balancesQueryKey(tripId) }),
    ...(eventId ? [client.invalidateQueries({ queryKey: ['events'] })] : []),
  ]);

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
      await refreshLedger(client, input.tripId, input.eventId);
    },
    retry: 0,
  });
};

/** Updates an expense through shared transport, then synchronizes cards, balances, and linked costs.
 * @returns A mutation accepting an expense draft and the query context it affects.
 */
export const useUpdateExpense = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, draft }: UpdateExpenseInput) =>
      patchToApi<Expense, ExpenseDraft>(
        `/api/ledger/expenses/${expenseId}`,
        draft,
      ),
    onSuccess: async (expense, input) => {
      client.setQueryData<Expense[]>(
        expensesQueryKey(input.tripId),
        (current) =>
          current?.map((item) =>
            item._id === input.expenseId ? expense : item,
          ),
      );
      await refreshLedger(client, input.tripId, input.eventId);
    },
    retry: 0,
  });
};
