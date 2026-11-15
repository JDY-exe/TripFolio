import { useRef, useState, type FormEvent } from 'react';
import { Combobox, Text, TextField } from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import type { ExpenseDraft } from '../../../queries/ledger';
import ExpenseParticipantPicker from './ExpenseParticipantPicker';
import type { TripTraveler } from '../../../queries/trips';
import { getApiErrorMessage } from '../../../utils/api';

interface ExpenseFormProps {
  formId: string;
  travelers: TripTraveler[];
  initialExpense?: ExpenseDraft;
  disabled: boolean;
  onSubmit: (draft: ExpenseDraft) => Promise<unknown>;
  onSaved: () => void;
}

interface ExpenseErrors {
  description?: string;
  amount?: string;
  paidBy?: string;
  splitAmong?: string;
  submit?: string;
}

/** Edits an expense draft with shared fields, validation, and a searchable participant picker.
 * @param props - Form ID, members, optional saved draft, pending state, and persistence callbacks.
 * @returns A form that retains its complete draft and selections when saving fails.
 */
const ExpenseForm = ({
  formId,
  travelers,
  initialExpense,
  disabled,
  onSubmit,
  onSaved,
}: ExpenseFormProps) => {
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [description, setDescription] = useState(
    initialExpense?.description ?? '',
  );
  const [amount, setAmount] = useState(initialExpense?.amount.toString() ?? '');
  const [paidBy, setPaidBy] = useState(
    () =>
      initialExpense?.paidBy ??
      travelers.find((traveler) => traveler.id === user?.id)?.id ??
      travelers[0]?.id ??
      '',
  );
  const [splitAmong, setSplitAmong] = useState(
    () =>
      initialExpense?.splitAmong ?? travelers.map((traveler) => traveler.id),
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

  /** Commits the picker selection and clears stale recipient or submission errors.
   * @param ids - Complete participant selection, including users hidden by search.
   * @returns Nothing; updates the local draft only.
   */
  const selectParticipants = (ids: string[]) => {
    setSplitAmong(ids);
    setErrors((current) => ({
      ...current,
      splitAmong: undefined,
      submit: undefined,
    }));
  };

  /** Validates the draft, saves one expense, and closes only after a successful save.
   * @param event - Native form submission, including Enter and the modal footer action.
   * @returns A promise that settles after the save and related cache refreshes complete.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || disabled) return;
    const nextErrors: ExpenseErrors = {};
    if (!description.trim()) nextErrors.description = 'Enter an expense name.';
    if (!validAmount) nextErrors.amount = 'Enter a positive amount.';
    if (!travelers.some((traveler) => traveler.id === paidBy))
      nextErrors.paidBy = 'Choose who paid.';
    if (count === 0)
      nextErrors.splitAmong = 'Select at least one person to split with.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstField = Object.keys(nextErrors)[0];
      const target =
        firstField === 'splitAmong'
          ? (formRef.current?.querySelector<HTMLButtonElement>(
              '[aria-pressed]',
            ) ?? formRef.current?.elements.namedItem('participantSearch'))
          : formRef.current?.elements.namedItem(firstField);
      if (target instanceof HTMLElement) target.focus();
      return;
    }
    submittingRef.current = true;
    try {
      await onSubmit({
        description: description.trim(),
        amount: total,
        paidBy,
        splitAmong,
      });
      onSaved();
    } catch (error) {
      setErrors({
        submit: getApiErrorMessage(
          error,
          'Could not save the expense. Please try again.',
        ),
      });
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <form
      id={formId}
      ref={formRef}
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-10"
      aria-busy={disabled}
    >
      <div className="grid min-w-0 content-start gap-5">
        <TextField
          id={`${formId}-description`}
          name="description"
          label="Expense"
          textSize="title"
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
          disabled={disabled}
          required
          data-cy="expense-description"
        />
        <div className="grid min-w-0 grid-cols-2 items-start gap-4 md:grid-cols-1 md:gap-5">
          <TextField
            id={`${formId}-amount`}
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            label="Amount · USD"
            textSize="title"
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
            disabled={disabled}
            required
            data-cy="expense-amount"
          />
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
            disabled={disabled || travelers.length === 0}
            required
            dataCyPrefix="expense-payer"
            testIds={{ input: 'expense-payer' }}
          />
        </div>
      </div>
      <ExpenseParticipantPicker
        travelers={travelers}
        currentUserId={user?.id}
        selectedIds={splitAmong}
        onSelectionChange={selectParticipants}
        disabled={disabled}
        error={errors.splitAmong}
        shareLabel={
          count > 0 && validAmount
            ? `${approximate ? '≈ ' : ''}${share} ${count === 1 ? 'total' : 'each'}`
            : undefined
        }
      />
      {!!errors.submit && (
        <Text
          color="error"
          role="alert"
          className="md:col-span-full"
          data-cy="expense-submit-error"
        >
          {errors.submit}
        </Text>
      )}
    </form>
  );
};

export default ExpenseForm;
