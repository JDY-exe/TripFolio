import { useEffect, useState } from 'react';
import { Text } from '../../../components/common';
import { getBlobFromApi } from '../../../utils/api';

/** Renders a protected saved cover or a locally selected replacement.
 * @param props - Trip identifier and either an image ID or draft file.
 * @returns An image preview with accessible alternative text.
 */
const CoverPreview = ({
  tripId,
  value,
}: {
  tripId: string;
  value: unknown;
}) => {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    const load = async () => {
      const blob =
        value instanceof File
          ? value
          : await getBlobFromApi(
              `/trip/${tripId}/profile_picture?v=${String(value)}`,
            );
      objectUrl = URL.createObjectURL(blob);
      if (active) setUrl(objectUrl);
      else URL.revokeObjectURL(objectUrl);
    };
    if (value) void load().catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tripId, value]);
  return (
    <>
      {url && (
        <img
          src={url}
          alt="Trip cover"
          className="mt-2 aspect-video w-full rounded-panel object-cover"
        />
      )}
      {!url && <Text color="muted">No preview available</Text>}
    </>
  );
};

/** Formats nested booking values and dates without exposing API metadata.
 * @param value - A saved or drafted editable value.
 * @returns Human-readable comparison text.
 */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value))
    return value
      .map((item, index) => `Leg ${index + 1}\n${formatValue(item)}`)
      .join('\n\n');
  if (typeof value === 'object')
    return Object.entries(value)
      .filter(([key]) => key !== '_id')
      .map(([key, item]) => `${labelFor(key)}: ${formatValue(item)}`)
      .join('\n');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return value.replace('T', ' ').replace(/:00\.000Z$/, ' UTC');
  return String(value);
};

/** Converts API field names to readable labels for comparison rows. */
const labelFor = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (first) => first.toUpperCase());

/** Compares the current document with the proposed draft, retaining unrelated saved fields.
 * @param props - Current saved record, submitted patch, and owning trip.
 * @returns A two-column accessible comparison table.
 */
const ConflictComparison = ({
  current,
  draft,
  tripId,
}: {
  current: Record<string, unknown>;
  draft: Record<string, unknown>;
  tripId: string;
}) => {
  const hidden = new Set([
    '_id',
    '__v',
    'version',
    'createdAt',
    'updatedAt',
    'trip',
    'tripId',
    'itineraryID',
    'ownerId',
    'users',
    'viewerIds',
    'reservations',
    'currentUserRole',
    'travelers',
    'lat',
    'lng',
  ]);
  const keys = [
    ...new Set([...Object.keys(current), ...Object.keys(draft)]),
  ].filter((key) => !hidden.has(key));
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-left">
        <thead>
          <tr>
            <th className="p-2">Field</th>
            <th className="p-2">Saved version</th>
            <th className="p-2">Your draft</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key} className="border-t border-outline-variant">
              <th className="p-2 align-top font-medium">{labelFor(key)}</th>
              {[
                current[key],
                Object.hasOwn(draft, key) ? draft[key] : current[key],
              ].map((value, index) => (
                <td
                  key={index}
                  className="whitespace-pre-wrap break-words p-2 align-top"
                >
                  {key === 'profilePictureId' && (
                    <CoverPreview tripId={tripId} value={value} />
                  )}
                  {key !== 'profilePictureId' && formatValue(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default ConflictComparison;
