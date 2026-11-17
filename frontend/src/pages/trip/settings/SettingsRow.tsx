import type { ReactNode } from 'react';
import { Text } from '../../../components/common';

interface SettingsRowProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  danger?: boolean;
}

/** Aligns a setting's explanation with its action, stacking buttons on mobile.
 * @param props - Setting title, supporting text, control, and destructive tone.
 * @returns A divided row with a responsive action area.
 */
const SettingsRow = ({
  title,
  description,
  children,
  danger = false,
}: SettingsRowProps) => (
  <div className="flex flex-col gap-4 border-b border-outline-variant py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <div className="min-w-0 max-w-prose">
      <Text as="h4" variant="label" color={danger ? 'error' : 'default'}>
        {title}
      </Text>
      <Text color="muted" className="mt-1">
        {description}
      </Text>
    </div>
    <div className="shrink-0 self-start sm:self-center">{children}</div>
  </div>
);

export default SettingsRow;
