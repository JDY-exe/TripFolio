import { useId, useRef, useState, type FormEvent } from 'react';
import {
  Button,
  Chip,
  Combobox,
  Modal,
  Text,
  TextField,
} from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import { useCreateExpense } from '../../../queries/ledger';
import type { TripTraveler } from '../../../queries/trips';
import { getApiErrorMessage } from '../../../utils/api';

interface AddExpenseModalProps {
  tripId: string;
  travelers: TripTraveler[];
  onClose: () => void;
}

interface ExpenseErrors {
  description?: string;
  amount?: string;
  paidBy?: string;
  splitAmong?: string;
  submit?: string;
}

/** Creates a compact expense draft in the shared modal with equal participant shares.
 * @param props - Trip, available travelers, and a callback to unmount the closed modal.
 * @returns An accessible modal whose selectable chips remain visible while saving or editing.
 */
const AddExpenseModal = ({
  tripId,
  travelers,
  onClose,
}: AddExpenseModalProps) => {
  const { user } = useAuth();
  const createExpense = useCreateExpense();
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [open, setOpen] = useState(true);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(
    () =>
      travelers.find((traveler) => traveler.id === user?.id)?.id ??
      travelers[0]?.id ??
      '',
  );
  const [splitAmong, setSplitAmong] = useState(() =>
    travelers.map((traveler) => traveler.id),
  );
  const [errors, setErrors] = useState<ExpenseErrors>({});
  const count = splitAmong.length;
  const total = Number(amount);
  const validAmount =
    /^\d+(\.\d{1,2})?$/.test(amount) && Number.isFinite(total) && total > 0;
  const approximate = count > 0 && Math.round(total * 100) % count !== 0;
  const share = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(count > 0 ? total / count : 0);

  /** Toggles a participant without hiding their chip or changing the payer.
   * @param travelerId - Traveler whose inclusion should change.
   * @returns Nothing; updates the local selection and clears stale errors.
   */
  const toggleParticipant = (travelerId: string) => {
    setSplitAmong((current) =>
      current.includes(travelerId)
        ? current.filter((id) => id !== travelerId)
        : [...current, travelerId],
    );
    setErrors((current) => ({
      ...current,
      splitAmong: undefined,
      submit: undefined,
    }));
  };

  /** Validates the draft, creates one expense, and closes only after a successful save.
   * @param event - Native form submission, including Enter and the modal footer action.
   * @returns A promise that settles after the save and related cache refreshes complete.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !open) return;
    const nextErrors: ExpenseErrors = {};
    if (!description.trim()) nextErrors.description = 'Enter an expense name.';
    if (!validAmount)
      nextErrors.amount =
        'Enter a positive amount.';
    if (!travelers.some((traveler) => traveler.id === paidBy))
      nextErrors.paidBy = 'Choose who paid.';
    if (count === 0)
      nextErrors.splitAmong = 'Select at least one person to split with.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstField = Object.keys(nextErrors)[0];
      const target =
        firstField === 'splitAmong'
          ? formRef.current?.querySelector<HTMLButtonElement>('[aria-pressed]')
          : formRef.current?.elements.namedItem(firstField);
      if (target instanceof HTMLElement) target.focus();
      return;
    }
    submittingRef.current = true;
    try {
      await createExpense.mutateAsync({
        tripId,
        description: description.trim(),
        amount: total,
        paidBy,
        splitAmong,
      });
      setOpen(false);
    } catch (error) {
      setErrors({
        submit: getApiErrorMessage(
          error,
          'Could not add the expense. Please try again.',
        ),
      });
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <Modal
      open={open}
      title="Add expense"
      onClose={onClose}
      onExited={onClose}
      dismissDisabled={createExpense.isPending}
      panelClassName="max-w-lg"
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
      <form
        id={formId}
        ref={formRef}
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex min-w-0 flex-col gap-5"
        aria-busy={createExpense.isPending}
      >
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <TextField
            id={`${formId}-description`}
            name="description"
            label="Expense"
            placeholder="e.g. Dinner"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setErrors((current) => ({
                ...current,
                description: undefined,
                submit: undefined,
              }));
            }}
            error={errors.description}
            disabled={createExpense.isPending}
            required
            data-cy="expense-description"
          />
          <TextField
            id={`${formId}-amount`}
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            label="Amount · USD"
            placeholder="0.00"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setErrors((current) => ({
                ...current,
                amount: undefined,
                submit: undefined,
              }));
            }}
            error={errors.amount}
            disabled={createExpense.isPending}
            required
            data-cy="expense-amount"
          />
        </div>
        <Combobox
          id={`${formId}-payer`}
          name="paidBy"
          label="Paid by"
          selectedIds={[paidBy]}
          options={travelers.map((traveler) => ({
            id: traveler.id,
            label: traveler.id === user?.id ? 'You' : traveler.username,
            searchText: traveler.username,
          }))}
          multiple={false}
          selectionDisplay="text"
          placeholder="Search travelers"
          emptyMessage="No travelers are available for this trip."
          noResultsMessage="No travelers match your search."
          onSelectionChange={(ids) => {
            setPaidBy(ids[0] ?? '');
            setErrors((current) => ({
              ...current,
              paidBy: undefined,
              submit: undefined,
            }));
          }}
          error={errors.paidBy}
          disabled={createExpense.isPending || travelers.length === 0}
          required
          dataCyPrefix="expense-payer"
          testIds={{ input: 'expense-payer' }}
        />
        <div>
          <div className="flex items-center justify-between gap-2">
            <Text
              as="span"
              variant="label"
              id={`${formId}-split-label`}
              data-cy="expense-split-label"
            >
              Paid for {count} {count === 1 ? 'person' : 'people'}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              disabled={createExpense.isPending || travelers.length === 0}
              onClick={() => {
                setSplitAmong(travelers.map((traveler) => traveler.id));
                setErrors((current) => ({
                  ...current,
                  splitAmong: undefined,
                  submit: undefined,
                }));
              }}
              data-cy="expense-select-all"
            >
              Select all
            </Button>
          </div>
          <div
            role="group"
            aria-labelledby={`${formId}-split-label`}
            aria-describedby={
              errors.splitAmong ? `${formId}-split-error` : undefined
            }
            className="flex flex-wrap gap-x-2"
          >
            {travelers.map((traveler) => (
              <Chip
                key={traveler.id}
                label={traveler.id === user?.id ? 'You' : traveler.username}
                selected={splitAmong.includes(traveler.id)}
                onToggle={() => toggleParticipant(traveler.id)}
                disabled={createExpense.isPending}
                data-cy={`expense-person-${traveler.id}`}
              />
            ))}
          </div>
          {travelers.length === 0 && (
            <Text color="muted">No travelers are available for this trip.</Text>
          )}
          <div aria-live="polite" className="mt-2">
            {count > 0 && validAmount && (
              <Text
                variant="label"
                color="muted"
                className="tabular-nums"
                data-cy="expense-share"
              >
                {approximate ? '≈ ' : ''}
                {share} {count === 1 ? 'total' : 'each'}
              </Text>
            )}
          </div>
          {!!errors.splitAmong && (
            <Text
              id={`${formId}-split-error`}
              color="error"
              variant="caption"
              role="alert"
              data-cy="expense-split-error"
            >
              {errors.splitAmong}
            </Text>
          )}
        </div>
        {!!errors.submit && (
          <Text color="error" role="alert" data-cy="expense-submit-error">
            {errors.submit}
          </Text>
        )}
      </form>
    </Modal>
  );
};

export default AddExpenseModal;
