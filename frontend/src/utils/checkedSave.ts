import axios from 'axios';
import { patchToApi } from './api';
import { resolveEditConflict } from '../components/common/EditConflictDialog/conflictStore';

export interface VersionedRecord {
  _id: string;
  version: number;
}
export interface CheckedPatch {
  expectedVersion: number;
  changes: Record<string, unknown>;
  original: Record<string, unknown>;
}
export interface EditConflict {
  code: 'EDIT_CONFLICT';
  current: VersionedRecord & Record<string, unknown>;
  mergedChanges?: Record<string, unknown>;
  conflicts: {
    field: string;
    group?: string[];
    rootField?: string;
    label?: string;
    original: unknown;
    current: unknown;
    submitted: unknown;
  }[];
}
/** Reads a dotted field from a record. @returns The field value, if present. */
export const readField = (record: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[key]
          : undefined,
      record,
    );
/** Normalizes empty optionals and date encodings for draft comparisons. */
const canonical = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/.test(value)
  ) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
};
/** Compares normalized editable values, treating arrays as one logical field. */
export const equalField = (a: unknown, b: unknown): boolean =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
/** Builds a minimal checked patch; coupled identity paths are submitted together.
 * @param snapshot - Original local record, including its version.
 * @param values - Editable draft values keyed by API field path.
 * @param groups - Coupled paths forming one logical field.
 * @returns Only changed fields and their original values.
 */
export const createCheckedPatch = <T extends VersionedRecord>(
  snapshot: T,
  values: Record<string, unknown>,
  groups: string[][] = [],
): CheckedPatch => {
  const changed = new Set(
    Object.keys(values).filter(
      (key) => !equalField(readField(snapshot, key), values[key]),
    ),
  );
  groups.forEach((group) => {
    if (group.some((key) => changed.has(key)))
      group.forEach((key) => changed.add(key));
  });
  return {
    expectedVersion: snapshot.version,
    changes: Object.fromEntries(
      [...changed].map((key) => [key, values[key] ?? null]),
    ),
    original: Object.fromEntries(
      [...changed].map((key) => [key, readField(snapshot, key) ?? null]),
    ),
  };
};
/** Overlays checked dotted-field changes on a fresh record for a local editor draft.
 * @param current - Latest server snapshot.
 * @param changes - Resolved changes still intended by the user.
 * @returns A separate merged draft without mutating the original snapshot.
 */
export const mergeCheckedDraft = <T extends VersionedRecord>(
  current: T,
  changes: Record<string, unknown>,
): T => {
  const draft = structuredClone(current);
  for (const [field, value] of Object.entries(changes)) {
    const parts = field.split('.');
    if (
      parts.some((part) =>
        ['__proto__', 'prototype', 'constructor'].includes(part),
      )
    )
      continue;
    let target = draft as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) {
      if (!target[part] || typeof target[part] !== 'object') target[part] = {};
      target = target[part] as Record<string, unknown>;
    }
    target[parts.at(-1)!] = value;
  }
  return draft;
};

/** Retries checked saves after explicit conflict choices, preserving unrelated edits.
 * No force-write request exists: each retry uses the returned record's version.
 */
export const saveChecked = async <T>(
  url: string,
  initial: CheckedPatch,
  extra: Record<string, unknown> = {},
  onRebase?: (
    current: EditConflict['current'],
    changes: Record<string, unknown>,
  ) => void,
): Promise<T> => {
  let patch = initial;
  for (;;) {
    try {
      return await patchToApi<T>(url, { ...extra, ...patch });
    } catch (error) {
      if (
        !axios.isAxiosError<EditConflict>(error) ||
        error.response?.status !== 409 ||
        error.response.data.code !== 'EDIT_CONFLICT'
      )
        throw error;
      const conflict = error.response.data;
      if (!conflict.current || conflict.conflicts.length === 0) throw error;
      const choices = await resolveEditConflict(conflict);
      if (!choices)
        throw new Error(
          'Save cancelled. Your changes are still in the editor.',
          { cause: error },
        );
      const changes = { ...patch.changes, ...conflict.mergedChanges };
      conflict.conflicts.forEach(({ field, rootField, current, submitted }) => {
        const value = choices[field] === 'saved' ? current : submitted;
        if (rootField) {
          const resolved = mergeCheckedDraft(
            { _id: 'draft', version: 0, ...changes },
            { [field]: value },
          );
          changes[rootField] = readField(resolved, rootField);
        } else changes[field] = value;
      });
      conflict.conflicts.forEach(({ field, group, rootField }) => {
        const paths = rootField ? [rootField] : (group ?? [field]);
        if (
          paths.every((path) =>
            equalField(changes[path], readField(conflict.current, path)),
          )
        )
          paths.forEach((path) => {
            delete changes[path];
          });
      });
      onRebase?.(conflict.current, changes);
      patch = {
        expectedVersion: conflict.current.version,
        changes,
        original: Object.fromEntries(
          Object.keys(changes).map((key) => [
            key,
            readField(conflict.current, key) ?? null,
          ]),
        ),
      };
    }
  }
};
