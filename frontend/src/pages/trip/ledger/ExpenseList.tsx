import { Text } from '../../../components/common';
import type { Expense } from '../../../queries/ledger';
import type { TripTraveler } from '../../../queries/trips';
import ExpenseCard from './ExpenseCard';

interface ExpenseListProps {
  expenses: Expense[];
  travelers: TripTraveler[];
  loading: boolean;
  readOnly: boolean;
  onDelete: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
}

/** Presents one expense per row, preserving distinct loading and empty states.
 * @param props - Cached expenses, trip members, permissions, and existing modal callbacks.
 * @returns The expense list or its current status.
 */
const ExpenseList = ({
  expenses,
  travelers,
  loading,
  readOnly,
  onDelete,
  onEdit,
}: ExpenseListProps) => (
  <>
    {loading && (
      <Text color="muted" role="status">
        Loading expenses...
      </Text>
    )}
    {!loading && expenses.length === 0 && (
      <Text color="muted">No expenses logged yet.</Text>
    )}
    {!loading && expenses.length > 0 && (
      <div className="flex min-w-0 flex-col gap-3" data-cy="expense-list">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense._id}
            expense={expense}
            travelers={travelers}
            readOnly={readOnly}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    )}
  </>
);

export default ExpenseList;
