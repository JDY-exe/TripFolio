import { Pencil } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import {
  Button,
  IconButton,
  Text,
  TextField,
} from '../../../components/common';
import { useUpdateBudget, type Expense } from '../../../queries/ledger';
import { getApiErrorMessage } from '../../../utils/api';
import { ledgerCurrency } from './ledgerCurrency';

interface BudgetOverviewProps {
  tripId: string;
  initialBudget: number;
  expenses: Expense[];
  readOnly: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** Shows trip spending against its budget and supports an inline, validated editor.
 * @param props - Cached trip budget, expenses, permissions, and query status.
 * @returns A tonal budget panel; failed saves retain the draft and explain recovery.
 */
const BudgetOverview = ({
  tripId,
  initialBudget,
  expenses,
  readOnly,
  loading,
  error,
  onRetry,
}: BudgetOverviewProps) => {
  const headingId = useId();
  const inputId = useId();
  const editRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const updateBudget = useUpdateBudget();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [validation, setValidation] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const totalSpent = expenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const remaining = initialBudget - totalSpent;
  const hasBudget = initialBudget > 0;
  const overBudget = hasBudget && remaining < 0;

  /** Starts a fresh draft using the latest cached budget.
   * @returns Nothing; opens and focuses the inline editor.
   */
  const startEditing = () => {
    setDraft(String(initialBudget));
    setValidation(undefined);
    setSaveError(undefined);
    setEditing(true);
  };

  /** Closes the editor and focuses its trigger after React restores the button.
   * @returns Nothing.
   */
  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() =>
      editRef.current?.querySelector('button')?.focus(),
    );
  };

  /** Saves a finite nonnegative currency value through the shared mutation.
   * @param event - Native form submission, including Enter.
   * @returns A promise that settles after persistence and cache refresh.
   */
  const saveBudget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly || savingRef.current) return;
    const budget = Number(draft);
    if (
      !/^\d+(\.\d{1,2})?$/.test(draft) ||
      !Number.isFinite(budget) ||
      budget < 0
    ) {
      setValidation(
        'Enter a budget of $0 or more, with up to two decimal places.',
      );
      return;
    }
    savingRef.current = true;
    setValidation(undefined);
    setSaveError(undefined);
    try {
      await updateBudget.mutateAsync({ tripId, budget });
      closeEditor();
    } catch (caught) {
      setSaveError(
        getApiErrorMessage(caught, 'Could not save the budget. Try again.'),
      );
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      data-cy="budget-overview"
      className="rounded-panel bg-surface-container p-6 text-on-surface"
    >
      <header className="flex items-center justify-between gap-3">
        <Text as="h3" id={headingId} variant="title">
          Budget overview
        </Text>
        {!readOnly && !loading && !error && (
          <div ref={editRef}>
            <IconButton
              label="Edit budget"
              size="sm"
              icon={<Pencil aria-hidden size={18} />}
              onClick={startEditing}
              disabled={editing}
              data-cy="edit-budget"
            />
          </div>
        )}
      </header>
      {loading && (
        <Text className="mt-5" color="muted" role="status">
          Loading budget...
        </Text>
      )}
      {!loading && error && (
        <div className="mt-5 space-y-3">
          <Text color="error" role="alert">
            Could not load the budget overview.
          </Text>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
      {!loading && !error && !editing && (
        <div className="mt-5 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <Text variant="label" color="muted">
              Spent
            </Text>
            <Text className="tabular-nums" data-cy="budget-spent">
              {ledgerCurrency.format(totalSpent)}
            </Text>
          </div>
          {hasBudget && (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <Text variant="label" color="muted">
                  Trip budget
                </Text>
                <Text
                  variant="label"
                  className="tabular-nums"
                  data-cy="budget-total"
                >
                  {ledgerCurrency.format(initialBudget)}
                </Text>
              </div>

              <div className="flex items-baseline justify-between gap-3 border-t border-outline-variant pt-3">
                <Text variant="label">
                  {overBudget ? 'Over budget' : 'Remaining'}
                </Text>
                <Text
                  color={overBudget ? 'error' : 'primary'}
                  className="tabular-nums"
                  data-cy="budget-remaining"
                >
                  {ledgerCurrency.format(Math.abs(remaining))}
                </Text>
              </div>
            </>
          )}
          {!hasBudget && (
            <Text variant="label" color="muted">
              No trip budget set.
            </Text>
          )}
          {!hasBudget && !readOnly && (
            <Button variant="secondary" size="sm" onClick={startEditing}>
              Set budget
            </Button>
          )}
        </div>
      )}
      {!readOnly && editing && (
        <form
          className="mt-5 space-y-4"
          onSubmit={saveBudget}
          noValidate
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !updateBudget.isPending) {
              event.preventDefault();
              closeEditor();
            }
          }}
        >
          <TextField
            id={inputId}
            label="Trip budget (USD)"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={updateBudget.isPending}
            error={validation}
            textSize="title"
            data-cy="budget-input"
          />
          {!!saveError && (
            <Text
              color="error"
              variant="label"
              role="alert"
              data-cy="budget-save-error"
            >
              {saveError}
            </Text>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeEditor}
              disabled={updateBudget.isPending}
              data-cy="budget-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateBudget.isPending}
              data-cy="budget-save"
            >
              {updateBudget.isPending ? 'Saving...' : 'Save budget'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

export default BudgetOverview;
