import { describe, expect, it } from 'vitest';
import { getButtonClasses } from '../../../src/components/common/styles/componentStyles';

describe('getButtonClasses', () => {
  it('combines semantic variant and size tokens', () => {
    const classes = getButtonClasses('secondary', 'lg', false);

    expect(classes).toContain('bg-secondary-container');
    expect(classes).toContain('min-h-12');
    expect(classes).not.toContain('w-full');
  });

  it('adds width and consumer classes when requested', () => {
    const classes = getButtonClasses('outline', 'sm', true, 'mt-4');

    expect(classes).toContain('border-outline');
    expect(classes).toContain('w-full');
    expect(classes).toContain('mt-4');
  });
});
