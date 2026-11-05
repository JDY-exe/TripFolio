import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  archivedItineraryNoteQueryKey,
  useSaveArchivedItineraryNote,
  type ArchivedItineraryNote,
} from '../../src/queries/itineraries';
import { patchToApi, postToApi } from '../../src/utils/api';

vi.mock('../../src/utils/api', () => ({
  getFromApi: vi.fn(),
  postToApi: vi.fn(),
  patchToApi: vi.fn(),
}));

const savedNote: ArchivedItineraryNote = {
  _id: 'note-1',
  version: 0,
  tripId: 'trip-1',
  itineraryId: 'itinerary-1',
  authorId: 'owner-1',
  content: 'Private memory',
  createdAt: '2026-11-04T00:00:00.000Z',
  updatedAt: '2026-11-04T00:00:00.000Z',
};

/**
 * Captures a query mutation hook under its real provider without a browser.
 * @param useHook - Mutation hook to exercise.
 * @param client - Query client scoped to the test.
 * @returns The captured mutation result.
 */
const captureHook = <T>(useHook: () => T, client: QueryClient): T => {
  let result: T;
  const Probe = () => {
    result = useHook();
    return null;
  };
  renderToString(
    createElement(QueryClientProvider, { client }, createElement(Probe)),
  );
  return result!;
};

afterEach(() => vi.resetAllMocks());

describe('archived itinerary note mutations', () => {
  it('creates a note and updates only the matching user cache', async () => {
    const client = new QueryClient();
    const ownerKey = archivedItineraryNoteQueryKey('owner-1', 'trip-1');
    const viewerKey = archivedItineraryNoteQueryKey('viewer-1', 'trip-1');
    client.setQueryData(ownerKey, null);
    client.setQueryData(viewerKey, null);
    vi.mocked(postToApi).mockResolvedValue(savedNote);

    try {
      const mutation = captureHook(
        () => useSaveArchivedItineraryNote('owner-1', 'trip-1'),
        client,
      );
      await mutation.mutateAsync({ content: savedNote.content });

      expect(postToApi).toHaveBeenCalledWith('/itinerary/trip-1/notes', {
        content: savedNote.content,
      });
      expect(client.getQueryData(ownerKey)).toEqual(savedNote);
      expect(client.getQueryData(viewerKey)).toBeNull();
    } finally {
      client.clear();
    }
  });

  it('updates the existing note using PATCH', async () => {
    const client = new QueryClient();
    const noteKey = archivedItineraryNoteQueryKey('owner-1', 'trip-1');
    const updatedNote = { ...savedNote, content: 'Edited memory' };
    client.setQueryData(noteKey, savedNote);
    vi.mocked(patchToApi).mockResolvedValue(updatedNote);

    try {
      const mutation = captureHook(
        () => useSaveArchivedItineraryNote('owner-1', 'trip-1'),
        client,
      );
      await mutation.mutateAsync({
        content: updatedNote.content,
        noteId: savedNote._id,
        original: savedNote,
      });

      expect(patchToApi).toHaveBeenCalledWith('/itinerary/trip-1/notes', {
        expectedVersion: 0,
        changes: { content: updatedNote.content },
        original: { content: savedNote.content },
      });
      expect(client.getQueryData(noteKey)).toEqual(updatedNote);
    } finally {
      client.clear();
    }
  });

  it('uses separate cache keys for each user and trip', () => {
    expect(archivedItineraryNoteQueryKey('owner-1', 'trip-1')).not.toEqual(
      archivedItineraryNoteQueryKey('viewer-1', 'trip-1'),
    );
    expect(archivedItineraryNoteQueryKey('owner-1', 'trip-1')).not.toEqual(
      archivedItineraryNoteQueryKey('owner-1', 'trip-2'),
    );
  });
});
