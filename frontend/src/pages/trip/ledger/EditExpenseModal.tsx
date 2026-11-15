import { useId, useState } from 'react';
import { Button, Modal, Text } from '../../../components/common';
import { useUpdateExpense, type Expense } from '../../../queries/ledger';
import type { TripTraveler } from '../../../queries/trips';
import ExpenseForm from './ExpenseForm';

interface EditExpenseModalProps {
  expense: Expense;
  tripId: string;
  travelers: TripTraveler[];
  open: boolean;
  onClose: () => void;
}

/** Edits an existing expense with the same participant picker and validation as creation.
 * @param props - Saved expense, trip context, controlled visibility, and dismissal callback.
 * @returns A modal preserving saved participants until the user changes them.
 */
const EditExpenseModal = ({
  expense,
  tripId,
  travelers,
  open,
  onClose,
}: EditExpenseModalProps) => {
  const updateExpense = useUpdateExpense();
  const formId = useId();
  const [saved, setSaved] = useState(false);

  return (
    <Modal
      open={open && !saved}
      title={
        <Text as="span" variant="headline">
          Edit Expense
        </Text>
      }
      onClose={onClose}
      onExited={onClose}
      dismissDisabled={updateExpense.isPending}
      panelClassName="max-w-4xl"
      data-cy="edit-expense-dialog"
      footer={(requestClose) => (
        <>
          <Button
            variant="secondary"
            onClick={requestClose}
            disabled={updateExpense.isPending}
            data-cy="expense-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={updateExpense.isPending || travelers.length === 0}
            data-cy="expense-save"
          >
            {updateExpense.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      )}
    >
      <ExpenseForm
        key={expense._id}
        formId={formId}
        travelers={travelers}
        initialExpense={expense}
        disabled={updateExpense.isPending}
        onSubmit={(draft) =>
          updateExpense.mutateAsync({
            expenseId: expense._id,
            tripId,
            eventId: expense.eventId,
            draft,
          })
        }
        onSaved={() => setSaved(true)}
      />
    </Modal>
  );
};

export default EditExpenseModal;
