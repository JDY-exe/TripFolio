import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../../../src/components/common/Chip/Chip';
import TextField from '../../../src/components/common/TextField/TextField';
import { Combobox } from '../../../src/components/common/Combobox/Combobox';

describe('shared selection controls', () => {
  it('renders a single searchable value without removable chips or a second selected value', () => {
    const markup = renderToStaticMarkup(
      createElement(Combobox, {
        id: 'paid-by',
        label: 'Paid by',
        name: 'paidBy',
        options: [
          { id: 'maya', label: 'Maya' },
          { id: 'sam', label: 'Sam' },
        ],
        selectedIds: ['maya'],
        onSelectionChange: () => {},
        multiple: false,
        selectionDisplay: 'text',
        required: true,
      }),
    );
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('value="Maya"');
    expect(markup).toContain('aria-required="true"');
    expect(markup).toContain('for="paid-by"');
    expect(markup).not.toContain('Remove Maya');
    expect(markup).not.toContain('value="Sam"');
  });
  it('keeps removable chips compatible while exposing icon-free toggle semantics', () => {
    const removable = renderToStaticMarkup(
      createElement(Chip, { label: 'Maya', onRemove: () => {} }),
    );
    expect(removable).toContain('aria-label="Remove Maya"');
    expect(removable).toContain('<svg');
    for (const selected of [true, false]) {
      const toggle = renderToStaticMarkup(
        createElement(Chip, { label: 'Maya', selected, onToggle: () => {} }),
      );
      expect(toggle).toContain(`aria-pressed="${selected}"`);
      expect(toggle).toContain('aria-label="Maya"');
      expect(toggle).not.toContain('<svg');
    }
  });

  it('renders a labeled native select with selected options and accessible errors', () => {
    const markup = renderToStaticMarkup(
      createElement(
        TextField,
        {
          as: 'select',
          id: 'payer',
          label: 'Paid by',
          value: 'maya',
          error: 'Choose a payer.',
          onChange: () => {},
        },
        createElement('option', { value: 'maya' }, 'Maya'),
      ),
    );
    expect(markup).toContain('<select');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('as="select"');
    expect(markup).toContain('for="payer"');
    expect(markup).toContain('aria-describedby="payer-supporting"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('selected=""');
  });
});
