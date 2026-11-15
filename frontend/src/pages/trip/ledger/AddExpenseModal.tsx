import { useId, useState } from 'react';
import { Button, Modal, Text } from '../../../components/common';
import { useCreateExpense } from '../../../queries/ledger';
import type { TripTraveler } from '../../../queries/trips';
import ExpenseForm from './ExpenseForm';

interface AddExpenseModalProps {
  tripId: string;
  travelers: TripTraveler[];
  onClose: () => void;
}

/** Creates an expense through the shared form and cached ledger mutation.
 * @param props - Trip, available travelers, and the callback to unmount after dismissal.
 * @returns An accessible modal that starts with all trip members selected.
 */
const AddExpenseModal = ({
  tripId,
  travelers,
  onClose,
}: AddExpenseModalProps) => {
  const createExpense = useCreateExpense();
  const formId = useId();
  const [open, setOpen] = useState(true);

  return (
    <Modal
      open={open}
      title={
        <Text as="span" variant="display">
          Add expense
        </Text>
      }
      onClose={onClose}
      onExited={onClose}
      dismissDisabled={createExpense.isPending}
      panelClassName="max-w-4xl"
      data-cy="add-expense-dialog"
      footer={(requestClose) => (
        <>
          <Button
            variant="secondary"
            onClick={requestClose}
            disabled={createExpense.isPending}
            data-cy="expense-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={createExpense.isPending || travelers.length === 0}
            data-cy="expense-save"
          >
            {createExpense.isPending ? 'Adding…' : 'Add expense'}
          </Button>
        </>
      )}
    >
      <ExpenseForm
        formId={formId}
        travelers={travelers}
        disabled={createExpense.isPending}
        onSubmit={(draft) => createExpense.mutateAsync({ ...draft, tripId })}
        onSaved={() => setOpen(false)}
      />
    </Modal>
  );
};

export default AddExpenseModal;
