import type { EditConflict } from '../../../utils/checkedSave';
export type ConflictChoices = Record<string, 'saved' | 'yours'>;
interface PendingConflict {
  conflict: EditConflict;
  complete: (choices: ConflictChoices | null) => void;
}
let pending: PendingConflict | null = null;
const listeners = new Set<() => void>();
/** Subscribes the shared conflict viewport to pending review requests. */
export const subscribeConflict = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
/** Returns the stable pending-dialog snapshot. */
export const getPendingConflict = () => pending;
/** Requests explicit field choices without discarding the caller's draft. */
export const resolveEditConflict = (
  conflict: EditConflict,
): Promise<ConflictChoices | null> =>
  new Promise((resolve) => {
    if (pending) {
      resolve(null);
      return;
    }
    pending = {
      conflict,
      complete: (choices) => {
        pending = null;
        listeners.forEach((listener) => listener());
        resolve(choices);
      },
    };
    listeners.forEach((listener) => listener());
  });
