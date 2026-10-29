import { Badge } from 'lucide-react';
import type { ReactNode } from 'react';
import { Text } from '../../../components/common';

interface LogisticsEmptyStateProps {
  title: string;
  icon: ReactNode;
}

/**
 * Shows a centered empty category card with expressive background artwork.
 * @param props - Category message and decorative icon.
 * @returns A medium-height dashed card for an empty logistics list.
 */
const LogisticsEmptyState = ({ title, icon }: LogisticsEmptyStateProps) => (
  <div className="flex min-h-64 flex-col items-center justify-center rounded-panel border-2 border-dashed border-outline-variant bg-surface-container-low/60 px-5 py-8 text-center">
    <div
      aria-hidden="true"
      className="relative grid size-28 place-items-center"
    >
      <Badge
        size={112}
        fill="currentColor"
        strokeWidth={0}
        className="absolute rotate-12 text-primary-container"
      />
      <div className="relative grid size-14 place-items-center rounded-full text-primary">
        {icon}
      </div>
    </div>
    <Text variant="label" color="muted" className="mt-4">
      {title}
    </Text>
  </div>
);

export default LogisticsEmptyState;
