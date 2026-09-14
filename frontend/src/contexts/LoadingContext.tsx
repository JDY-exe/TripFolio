/* eslint-disable react-refresh/only-export-components -- The provider and hook intentionally share this context module. */
import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react'

export interface LoadingContextValue {
  /** Whether the application-wide blocking overlay is visible. */
  isLoading: boolean
  /** Shows, hides, or derives the application-wide loading state. */
  setLoading: Dispatch<SetStateAction<boolean>>
}

export interface LoadingProviderProps extends PropsWithChildren {
  /** Initial overlay visibility, primarily useful for application bootstrapping. */
  initialLoading?: boolean
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

/**
 * Provides shared loading state to the application. App owns presentation so
 * the loading screen can remain a sibling of the page tree.
 *
 * @param props - Child application tree and optional initial visibility.
 * @returns The loading context boundary around the application.
 */
export function LoadingProvider({
  children,
  initialLoading = false,
}: LoadingProviderProps) {
  const [isLoading, setLoading] = useState(initialLoading)

  return (
    <LoadingContext value={{ isLoading, setLoading }}>
      {children}
    </LoadingContext>
  )
}

/**
 * Reads the application-wide loading state and setter from the nearest
 * provider, rejecting usage outside the configured application boundary.
 *
 * @returns Current loading visibility and the `setLoading` state setter.
 * @throws When called outside `LoadingProvider`.
 */
export function useLoading() {
  const context = useContext(LoadingContext)

  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }

  return context
}
