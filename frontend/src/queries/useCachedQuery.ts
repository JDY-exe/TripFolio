import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

/** Subscribes to cached server data without creating a query observer or issuing requests.
 * @param queryKey - Existing entity query key to observe.
 * @returns The cached record or collection, or undefined when it has not been fetched.
 */
export const useCachedQuery = <T>(queryKey: QueryKey): T | undefined => {
  const client = useQueryClient();
  const subscribe = useCallback(
    (onChange: () => void) => client.getQueryCache().subscribe(onChange),
    [client],
  );
  const getSnapshot = () => client.getQueryData<T>(queryKey);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
