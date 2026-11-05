import { useEffect, useRef, useState } from 'react';
import { mergeCheckedDraft, type VersionedRecord } from '../utils/checkedSave';

/** Keeps an editor's original snapshot local and refreshes once per opening.
 * @param record - Cached record; cache updates never reset an open editor.
 * @param refresh - One best-effort fresh read, with no retry or blocking state.
 * @param apply - Replaces the form draft after that initial read succeeds.
 * @param active - Whether the editor is still open.
 * @returns The local original and a synchronous guard to call before saving.
 */
export const useEditorSnapshot = <T extends VersionedRecord>(
  record: T | undefined,
  refresh: () => Promise<T>,
  apply: (fresh: T) => void,
  active = true,
) => {
  const [original, setOriginal] = useState(record);
  const saving = useRef(false);
  const callbacks = useRef({ refresh, apply, record });
  useEffect(() => {
    callbacks.current = { refresh, apply, record };
  });
  const id = record?._id;
  useEffect(() => {
    if (!id || !active) return;
    let ignore = false;
    saving.current = false;
    const cached = callbacks.current.record;
    void Promise.resolve()
      .then(() => {
        if (!ignore && !saving.current) setOriginal(cached);
        return callbacks.current.refresh();
      })
      .then((fresh) => {
        if (ignore || saving.current || fresh._id !== id) return;
        setOriginal(fresh);
        callbacks.current.apply(fresh);
      })
      .catch(() => {
        /* Cached drafts remain usable on refresh failure. */
      });
    return () => {
      ignore = true;
    };
  }, [id, active]);
  /** Invalidates the initial refresh immediately, before awaiting a save. */
  const startSaving = () => {
    saving.current = true;
  };
  /** Rebases local originals and the visible draft after explicit conflict choices.
   * This keeps the resolved form usable if the next save fails validation.
   */
  const rebase = (current: T, changes: Record<string, unknown>) => {
    setOriginal(current);
    callbacks.current.apply(mergeCheckedDraft(current, changes));
  };
  return { original, startSaving, rebase };
};
