import { Pencil, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { IconButton, Text } from '../../../components/common';
import type { Expense } from '../../../queries/ledger';
import type { TripTraveler } from '../../../queries/trips';
import ExpensePerson from './ExpensePerson';
import ExpenseRecipients from './ExpenseRecipients';

interface ExpenseCardProps {
  expense: Expense;
  travelers: TripTraveler[];
  readOnly: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** Presents a full-width IOU with a right-aligned amount and discreet bottom-right actions.
 * @param props - Expense, member directory, permissions, and existing edit/delete callbacks.
 * @returns One card with an inline payer and responsive, expandable recipients.
 */
const ExpenseCard = ({
  expense,
  travelers,
  readOnly,
  onEdit,
  onDelete,
}: ExpenseCardProps) => {
  const headingId = useId();

  return (
    <article
      aria-labelledby={headingId}
      data-cy={`expense-card-${expense._id}`}
      className="group relative min-w-0 rounded-panel bg-surface-container-low p-4 sm:px-6 sm:py-5"
    >
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <Text
          id={headingId}
          as="h3"
          variant="title"
          className="min-w-0 break-words font-medium"
          data-cy="expense-card-title"
        >
          {expense.description}
        </Text>
        <Text
          as="span"
          variant="title"
          className="shrink-0 whitespace-nowrap tabular-nums"
          data-cy="expense-card-amount"
        >
          {currency.format(expense.amount)}
        </Text>
      </div>
      <div className="mb-1 flex min-w-0 items-center gap-2">
        <Text
          as="span"
          variant="label"
          color="muted"
          className="shrink-0 font-normal"
        >
          Paid by
        </Text>
        <ExpensePerson
          traveler={travelers.find(
            (traveler) => traveler.id === expense.paidBy,
          )}
          payer
        />
        <Text
          as="span"
          variant="label"
          color="muted"
          className="shrink-0 font-normal"
        >
          for
        </Text>
      </div>
      <ExpenseRecipients
        recipientIds={expense.splitAmong}
        travelers={travelers}
      />
      {!readOnly && (
        <div
          data-cy="expense-card-actions"
          className="pointer-events-none absolute bottom-4 right-3 flex gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100 motion-reduce:transition-none [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 sm:bottom-5 sm:right-5"
        >
          <IconButton
            label={`Edit ${expense.description}`}
            size="sm"
            data-cy={`edit-expense-${expense._id}`}
            icon={<Pencil aria-hidden size={18} />}
            onClick={() => onEdit(expense)}
          />
          <IconButton
            label={`Delete ${expense.description}`}
            size="sm"
            variant="dangerGhost"
            data-cy={`delete-expense-${expense._id}`}
            icon={<Trash2 aria-hidden size={18} />}
            onClick={() => onDelete(expense)}
          />
        </div>
      )}
    </article>
  );
};

export default ExpenseCard;
