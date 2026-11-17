import type { ReactNode } from 'react';
import { Text } from '../../../components/common';

interface SettingsSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

/** Groups related settings with a responsive heading column and section dividers.
 * @param props - Section identity, explanatory copy, and setting controls.
 * @returns A labeled section that stacks on smaller screens.
 */
const SettingsSection = ({
  id,
  title,
  description,
  children,
}: SettingsSectionProps) => (
  <section
    aria-labelledby={id}
    className="grid gap-5 border-t border-outline-variant py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10"
  >
    <header>
      <Text as="h3" id={id} variant="title">
        {title}
      </Text>
      <Text color="muted" className="mt-2 max-w-prose">
        {description}
      </Text>
    </header>
    <div className="min-w-0">{children}</div>
  </section>
);

export default SettingsSection;
