import { useState, useSyncExternalStore } from 'react';
import { Button, Modal, Text } from '../index';
import { getPendingConflict, subscribeConflict } from './conflictStore';
import type { ConflictChoices } from './conflictStore';
import type { EditConflict } from '../../../utils/checkedSave';

/** Formats complete field values without truncating the user's decision context. */
const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '(Empty)';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(new Date(value).getTime())
  )
    return `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value))} (UTC)`;
  return String(value);
};
/** Presents saved and submitted values with no preselected overwrite choice.
 * @param props - Current conflict and completion callback.
 * @returns A keyboard-accessible, responsive field-review dialog.
 */
const ConflictReview = ({
  conflict,
  complete,
}: {
  conflict: EditConflict;
  complete: (choices: ConflictChoices | null) => void;
}) => {
  const [choices, setChoices] = useState<ConflictChoices>({});
  return (
    <Modal
      open
      title="Review overlapping changes"
      description="Someone saved changes to these fields. Choose which values to keep. Your other edits will be preserved."
      onClose={() => complete(null)}
      footer={
        <>
          <Button variant="secondary" onClick={() => complete(null)}>
            Back to editor
          </Button>
          <Button
            data-cy="conflict-save"
            disabled={
              !conflict.conflicts.every(({ field }) => Boolean(choices[field]))
            }
            onClick={() => complete(choices)}
          >
            Save selected values
          </Button>
        </>
      }
    >
      <div className="grid gap-6" data-cy="edit-conflict-dialog">
        {conflict.conflicts.map(
          ({ field, label, group, current, submitted }) => (
            <fieldset key={field} className="min-w-0">
              <legend className="mb-3 font-semibold">
                {label ??
                  field
                    .replace(/([A-Z])/g, ' $1')
                    .replaceAll('.', ' · ')
                    .replace(/^./, (letter) => letter.toUpperCase())}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['saved', 'yours'] as const).map((choice) => (
                  <label
                    key={choice}
                    className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-outline-variant p-4 focus-within:outline-2 focus-within:outline-primary"
                  >
                    <input
                      type="radio"
                      name={`conflict-${field}`}
                      data-cy={`conflict-${field}-${choice}`}
                      value={choice}
                      checked={choices[field] === choice}
                      onChange={() =>
                        setChoices((previous) => ({
                          ...previous,
                          ...Object.fromEntries(
                            (group ?? [field]).map((key) => [key, choice]),
                          ),
                        }))
                      }
                      className="mt-1 h-5 w-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0">
                      <Text as="span" variant="label" className="block">
                        {choice === 'saved' ? 'Saved value' : 'Your value'}
                      </Text>
                      <Text
                        as="span"
                        className="mt-2 block whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                      >
                        {displayValue(choice === 'saved' ? current : submitted)}
                      </Text>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ),
        )}
      </div>
    </Modal>
  );
};
/** Mounts the single reusable conflict dialog for checked-save callers. */
const EditConflictDialog = () => {
  const pending = useSyncExternalStore(
    subscribeConflict,
    getPendingConflict,
    getPendingConflict,
  );
  return (
    <>
      {pending && (
        <ConflictReview
          key={`${pending.conflict.current._id}-${pending.conflict.current.version}`}
          conflict={pending.conflict}
          complete={pending.complete}
        />
      )}
    </>
  );
};
export default EditConflictDialog;
