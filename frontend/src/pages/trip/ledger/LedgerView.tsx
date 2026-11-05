import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Button, Modal, Text, displayAlert } from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import { deleteFromApi, getApiErrorMessage } from '../../../utils/api';
import { useTrips } from '../../../queries/trips';
import ErrorDisplay from '../../../components/common/ErrorDisplay/ErrorDisplay';

import BudgetOverview from './BudgetOverview';
import SummaryTable from './SummaryTable';
import ExpenseList from './ExpenseList';
import AddExpenseForm from './AddExpenseForm';
import EditExpenseModal from './EditExpenseModal';

export const expensesQueryKey = (tripId: string) => ['expenses', tripId];
export const balancesQueryKey = (tripId: string) => ['balances', tripId];

const LedgerView = ({
  readOnly = false,
  archived = false,
}: {
  readOnly?: boolean;
  archived?: boolean;
}) => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { trips } = useTrips(user?.id, archived);
  const trip = trips?.find((t) => t._id === id);

  // Queries (Mocking your standard query structure)
  const { data: expenses = [], isPending: expensesLoading, isError: expensesError, refetch: refetchExpenses } = useQuery({
    queryKey: expensesQueryKey(id ?? ''),
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ledger/expenses/${id}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: balances = [], isPending: balancesLoading } = useQuery({
    queryKey: balancesQueryKey(id ?? ''),
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ledger/${id}/balances`);
      if (!res.ok) throw new Error('Failed to fetch balances');
      return res.json();
    },
    enabled: !!id,
  });

  const [expenseToDelete, setExpenseToDelete] = useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any | null>(null);

  const handleDeleteExpense = async () => {
    if (readOnly || !expenseToDelete || isDeletingExpense) return;
    setIsDeletingExpense(true);
    try {
      await deleteFromApi(`/api/ledger/expenses/${expenseToDelete._id}`);
      // Invalidate both so the list shrinks and the balances recalculate instantly
      await queryClient.invalidateQueries({ queryKey: expensesQueryKey(id ?? '') });
      await queryClient.invalidateQueries({ queryKey: balancesQueryKey(id ?? '') });
      await queryClient.invalidateQueries({ queryKey: ['events'] }); 
      setDeleteModalOpen(false);
    } catch (error) {
      displayAlert({
        message: getApiErrorMessage(error, 'Could not delete the expense.'),
        tone: 'error',
      });
    } finally {
      setIsDeletingExpense(false);
    }
  };

  if (!id)
    return (
      <div className="col-span-full flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center gap-6 text-center">
        <ErrorDisplay message="Trip not found." />
      </div>
    );

  const travelers = trip?.travelers ?? [];

  return (
    <>
      {/* Main Column: Expenses */}
      <section aria-labelledby="ledger-heading" className="min-w-0 text-on-surface">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <Text as="h2" data-cy="trip-section-ledger" id="ledger-heading" variant="display">
            {archived ? 'Archived Ledger' : 'Ledger'}
          </Text>
        </header>

        {expensesError && (
          <div className="flex flex-col items-center gap-4 rounded-panel bg-surface-container-low p-8 text-center">
            <ErrorDisplay message="Could not load expenses." />
            <Button size="sm" onClick={() => void refetchExpenses()}>Retry</Button>
          </div>
        )}

        {!readOnly && (
          <div className="mb-8">
            <AddExpenseForm tripId={id} travelers={travelers} />
          </div>
        )}

        <ExpenseList 
          expenses={expenses} 
          travelers={travelers} 
          loading={expensesLoading} 
          readOnly={readOnly}
          onEdit={(expense: any) => setExpenseToEdit(expense)}
          onDelete={(expense: any) => {
            setExpenseToDelete(expense);
            setDeleteModalOpen(true);
          }} 
        />
      </section>

      {/* Sidebar Column: Budget & Balances */}
      <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
        <BudgetOverview 
          tripId={id} 
          initialBudget={(trip as any)?.budget ?? 0}
          expenses={expenses} 
          readOnly={readOnly} 
        />
        
        <SummaryTable 
          balances={balances} 
          travelers={travelers} 
          currentUserId={user?.id}
          loading={balancesLoading} 
        />
      </aside>

      {/* Deletion Modal */}
      {!readOnly && expenseToDelete && (
        <Modal
          data-cy="delete-expense-dialog"
          open={deleteModalOpen}
          title="Delete expense?"
          onClose={() => {
            if (!isDeletingExpense) setExpenseToDelete(null);
          }}
          onExited={() => setExpenseToDelete(null)}
          dismissDisabled={isDeletingExpense}
          footer={(requestClose) => (
            <>
              <Button variant="secondary" disabled={isDeletingExpense} onClick={requestClose}>
                Cancel
              </Button>
              <Button variant="danger" disabled={isDeletingExpense} onClick={() => void handleDeleteExpense()}>
                {isDeletingExpense ? 'Deleting...' : 'Delete expense'}
              </Button>
            </>
          )}
        >
          <Text>
            This expense will be permanently removed, and all member balances will be recalculated.
          </Text>
        </Modal>
      )}
      {!readOnly && expenseToEdit && (
        <EditExpenseModal
          open={!!expenseToEdit}
          expense={expenseToEdit}
          tripId={id}
          travelers={travelers}
          onClose={() => setExpenseToEdit(null)}
        />
      )}
    </>
  );
};

export default LedgerView;