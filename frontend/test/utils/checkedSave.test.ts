import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCheckedPatch, saveChecked } from '../../src/utils/checkedSave';
import { patchToApi } from '../../src/utils/api';
import { resolveEditConflict } from '../../src/components/common/EditConflictDialog/conflictStore';
vi.mock('../../src/utils/api', () => ({ patchToApi: vi.fn() }));
vi.mock('../../src/components/common/EditConflictDialog/conflictStore', () => ({
  resolveEditConflict: vi.fn(),
}));
const original = {
  _id: 'event',
  version: 3,
  notes: '',
  title: 'Walk',
  startTime: '2026-08-01T09:00:00.000Z',
  endTime: '2026-08-01T12:00:00.000Z',
  address: 'Old address',
  placeId: 'old',
};
beforeEach(() => vi.resetAllMocks());
describe('checked editor saves', () => {
  it('sends only changed fields and their original values', () => {
    expect(
      createCheckedPatch(original, {
        notes: 'Umbrella',
        title: 'Walk',
        startTime: '2026-08-01T09:00:00Z',
      }),
    ).toEqual({
      expectedVersion: 3,
      changes: { notes: 'Umbrella' },
      original: { notes: '' },
    });
  });
  it('keeps missing optionals equivalent to empty values and couples place identities', () => {
    expect(
      createCheckedPatch(original, { reservationMade: null }).changes,
    ).toEqual({});
    expect(
      createCheckedPatch(original, { address: 'New', placeId: 'old' }, [
        ['address', 'placeId'],
      ]),
    ).toEqual({
      expectedVersion: 3,
      changes: { address: 'New', placeId: 'old' },
      original: { address: 'Old address', placeId: 'old' },
    });
  });
  it('treats arrays as atomic fields', () => {
    expect(
      createCheckedPatch(
        { ...original, segments: [{ flightNum: '1' }] },
        { segments: [{ flightNum: '2' }] },
      ).changes,
    ).toEqual({ segments: [{ flightNum: '2' }] });
  });
  it('does not show a dialog for an automatically merged response', async () => {
    vi.mocked(patchToApi).mockResolvedValue({
      ...original,
      version: 5,
      notes: 'Umbrella',
    });
    await saveChecked(
      '/event/event',
      createCheckedPatch(original, { notes: 'Umbrella' }),
    );
    expect(resolveEditConflict).not.toHaveBeenCalled();
  });
  it('resolves an overlap while preserving unrelated draft edits and rebasing the version', async () => {
    const current = {
      ...original,
      version: 4,
      title: 'Saved title',
      startTime: '2026-08-01T10:00:00.000Z',
    };
    vi.mocked(patchToApi)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            code: 'EDIT_CONFLICT',
            current,
            conflicts: [
              {
                field: 'startTime',
                original: original.startTime,
                current: current.startTime,
                submitted: '2026-08-01T11:00:00.000Z',
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({ ...current, version: 5 });
    vi.mocked(resolveEditConflict).mockResolvedValue({ startTime: 'saved' });
    await saveChecked(
      '/event/event',
      createCheckedPatch(original, {
        startTime: '2026-08-01T11:00:00.000Z',
        notes: 'My unrelated note',
      }),
    );
    expect(patchToApi).toHaveBeenLastCalledWith('/event/event', {
      expectedVersion: 4,
      changes: { notes: 'My unrelated note' },
      original: { notes: '' },
    });
  });
  it('resolves linked scalar conflicts without reverting other merged event fields', async () => {
    const currentActions = [
      {
        eventType: 'hotel_checkin',
        startTime: '2030-04-01T10:00:00.000Z',
        endTime: '2030-04-01T12:00:00.000Z',
      },
    ];
    const submittedActions = [
      {
        ...currentActions[0],
        startTime: '2030-04-01T11:00:00.000Z',
        endTime: '2030-04-01T13:00:00.000Z',
      },
    ];
    const current = {
      ...original,
      version: 4,
      itineraryActions: currentActions,
    };
    vi.mocked(patchToApi)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            code: 'EDIT_CONFLICT',
            current,
            mergedChanges: { itineraryActions: submittedActions },
            conflicts: [
              {
                field: 'itineraryActions.0.startTime',
                rootField: 'itineraryActions',
                original: original.startTime,
                current: currentActions[0].startTime,
                submitted: submittedActions[0].startTime,
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({ reservation: current });
    vi.mocked(resolveEditConflict).mockResolvedValue({
      'itineraryActions.0.startTime': 'saved',
    });
    const onRebase = vi.fn();
    await saveChecked(
      '/logistics/hotels/booking',
      {
        expectedVersion: 3,
        changes: { itineraryActions: submittedActions },
        original: { itineraryActions: [] },
      },
      {},
      onRebase,
    );
    expect(patchToApi).toHaveBeenLastCalledWith('/logistics/hotels/booking', {
      expectedVersion: 4,
      changes: {
        itineraryActions: [
          { ...currentActions[0], endTime: submittedActions[0].endTime },
        ],
      },
      original: { itineraryActions: currentActions },
    });
    expect(onRebase).toHaveBeenCalledWith(current, {
      itineraryActions: [
        { ...currentActions[0], endTime: submittedActions[0].endTime },
      ],
    });
  });
  it.each([false, true])(
    'preserves merged action edits when resolving booking conflicts (action conflict: %s)',
    async (actionConflict) => {
      const beforeAction = {
        eventType: 'hotel_checkin',
        startTime: '2030-04-01T14:00:00.000Z',
        endTime: '2030-04-01T18:00:00.000Z',
      };
      const savedAction = {
        ...beforeAction,
        startTime: '2030-04-01T15:00:00.000Z',
      };
      const submittedAction = {
        ...beforeAction,
        startTime: actionConflict
          ? '2030-04-01T16:00:00.000Z'
          : beforeAction.startTime,
        endTime: '2030-04-01T19:00:00.000Z',
      };
      const mergedAction = {
        ...submittedAction,
        startTime: actionConflict
          ? submittedAction.startTime
          : savedAction.startTime,
      };
      const current = {
        ...original,
        version: 4,
        notes: 'A notes',
        itineraryActions: [savedAction],
      };
      const conflicts = [
        {
          field: 'notes',
          original: original.notes,
          current: current.notes,
          submitted: 'B notes',
        },
        ...(actionConflict
          ? [
              {
                field: 'itineraryActions.0.startTime',
                rootField: 'itineraryActions',
                original: beforeAction.startTime,
                current: savedAction.startTime,
                submitted: submittedAction.startTime,
              },
            ]
          : []),
      ];
      vi.mocked(patchToApi)
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: {
            status: 409,
            data: {
              code: 'EDIT_CONFLICT',
              current,
              conflicts,
              mergedChanges: { itineraryActions: [mergedAction] },
            },
          },
        })
        .mockResolvedValueOnce({ reservation: current });
      vi.mocked(resolveEditConflict).mockResolvedValue({
        notes: 'saved',
        'itineraryActions.0.startTime': 'yours',
      });
      await saveChecked(
        '/logistics/hotels/booking',
        createCheckedPatch(
          { ...original, itineraryActions: [beforeAction] },
          { notes: 'B notes', itineraryActions: [submittedAction] },
        ),
      );
      expect(resolveEditConflict).toHaveBeenCalledWith(
        expect.objectContaining({ conflicts }),
      );
      expect(patchToApi).toHaveBeenLastCalledWith('/logistics/hotels/booking', {
        expectedVersion: current.version,
        changes: { itineraryActions: [mergedAction] },
        original: { itineraryActions: current.itineraryActions },
      });
    },
  );
  it('leaves ordinary validation errors to existing error handling', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 400, data: { message: 'Invalid range' } },
    };
    vi.mocked(patchToApi).mockRejectedValue(error);
    await expect(
      saveChecked(
        '/event/event',
        createCheckedPatch(original, { notes: 'Mine' }),
      ),
    ).rejects.toBe(error);
    expect(resolveEditConflict).not.toHaveBeenCalled();
  });
});
