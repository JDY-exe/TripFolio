import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, UserRound } from 'lucide-react';
import Button from '../Button';
import { Chip } from '../Chip/Chip';
import { InfoPopover } from '../InfoPopover/InfoPopover';
import LoadingIndicator from '../LoadingIndicator';
import IconButton from '../IconButton';
import Text from '../Text';

export interface ComboboxOption {
  id: string;
  label: string;
  searchText?: string;
  imageUrl?: string | null;
  disabled?: boolean;
  disabledReason?: string;
}

export interface ComboboxProps {
  id?: string;
  name?: string;
  label: string;
  options: readonly ComboboxOption[];
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  multiple?: boolean;
  required?: boolean;
  selectionDisplay?: 'chips' | 'text';
  disabled?: boolean;
  className?: string;
  description?: string;
  placeholder?: string;
  emptyMessage?: string;
  noResultsMessage?: string;
  listLabel?: string;
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
  error?: string;
  dataCyPrefix?: string;
  testIds?: {
    input?: string;
    list?: string;
    optionPrefix?: string;
    disabledPrefix?: string;
  };
}

/** Searches supplied options with controlled single or multiple selection.
 * @param props - Options, selected IDs, field copy, remote-data status, and selection behavior.
 * @returns An accessible combobox; text mode restores the committed single value on dismissal.
 */
export const Combobox = ({
  id,
  name,
  label,
  options,
  selectedIds,
  onSelectionChange,
  multiple = false,
  required = false,
  selectionDisplay = 'chips',
  disabled = false,
  className,
  description,
  placeholder = 'Search…',
  emptyMessage = 'No options available.',
  noResultsMessage = 'No options match your search.',
  listLabel = label,
  loading = false,
  loadError,
  onRetry,
  error,
  dataCyPrefix = 'combobox',
  testIds,
}: ComboboxProps) => {
  const generatedId = useId();
  const searchId = id ?? generatedId;
  const listId = `${searchId}-options`;
  const errorId = `${searchId}-error`;
  const input = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const textMode = selectionDisplay === 'text' && !multiple;
  const normalizedSearch = (search ?? '').trim().toLocaleLowerCase();
  const visibleOptions =
    loading || loadError
      ? []
      : options.filter((option) =>
          `${option.label} ${option.searchText ?? ''}`
            .toLocaleLowerCase()
            .includes(normalizedSearch),
        );
  const availableOptions = visibleOptions.filter((option) => !option.disabled);
  const selectedOptions = options.filter(
    (option) => selectedIds.includes(option.id) && !option.disabled,
  );
  const expanded = open && !disabled;
  const activeOptionId = availableOptions.some(
    (option) => option.id === activeId,
  )
    ? activeId
    : undefined;
  const inputValue =
    search ?? (textMode ? (selectedOptions[0]?.label ?? '') : '');

  /** Dismisses the list and restores the committed selection label in text mode.
   * @returns Nothing; clears only the transient search and active-option state.
   */
  const dismiss = useCallback(() => {
    setOpen(false);
    if (textMode) setSearch(null);
    setActiveId(undefined);
  }, [textMode]);

  useEffect(() => {
    if (!expanded) return;
    /** Dismisses suggestions after a pointer press outside the component.
     * @param event - Document pointer event.
     * @returns Nothing.
     */
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !wrapper.current?.contains(event.target)
      )
        dismiss();
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [expanded, dismiss]);

  /** Commits an available option, replacing the previous value in single mode.
   * @param optionId - ID selected by keyboard or pointer.
   * @returns Nothing; reports at most one ID when multiple is false.
   */
  const selectOption = (optionId: string) => {
    if (
      disabled ||
      !options.some((option) => option.id === optionId && !option.disabled)
    )
      return;
    const selected = selectedIds.includes(optionId);
    const mayRemove =
      (multiple || !textMode) && (!required || selectedOptions.length > 1);
    onSelectionChange(
      selected && mayRemove
        ? selectedIds.filter((value) => value !== optionId)
        : multiple && !selected
          ? [...selectedIds, optionId]
          : multiple
            ? [...selectedIds]
            : [optionId],
    );
    input.current?.focus();
    if (!multiple) dismiss();
  };

  return (
    <div
      ref={wrapper}
      className={className}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
    >
      <div className="mb-2 flex items-center gap-1">
        <Text as="label" htmlFor={searchId} variant="label">
          {label}
        </Text>
        {!!description && (
          <InfoPopover label={`About ${label.toLocaleLowerCase()}`}>
            {description}
          </InfoPopover>
        )}
      </div>
      <div className="relative">
        <div
          data-cy={`${dataCyPrefix}-combobox`}
          className={[
            'flex min-h-12 flex-wrap items-center gap-x-2 rounded-xl border border-outline bg-surface-container-low px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
            disabled ? 'opacity-50' : '',
            error ? 'border-error' : '',
          ].join(' ')}
        >
          {!textMode &&
            selectedOptions.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                avatar={
                  <>
                    {!!option.imageUrl && <img src={option.imageUrl} alt="" />}
                    {!option.imageUrl && <UserRound aria-hidden size={16} />}
                  </>
                }
                disabled={
                  disabled || (required && selectedOptions.length === 1)
                }
                data-cy={`${dataCyPrefix}-selected-${option.id}`}
                onRemove={() => selectOption(option.id)}
              />
            ))}
          <input
            ref={input}
            id={searchId}
            name={name}
            data-cy={testIds?.input ?? `${dataCyPrefix}-search`}
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={expanded}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={
              expanded && activeOptionId
                ? `${listId}-${activeOptionId}`
                : undefined
            }
            autoComplete="off"
            disabled={disabled}
            className="min-h-12 min-w-0 flex-1 basis-24 bg-transparent py-3 text-body text-on-surface outline-none placeholder:text-on-surface-variant disabled:cursor-not-allowed"
            onFocus={() => {
              setOpen(true);
              if (textMode) setSearch('');
            }}
            onClick={() => {
              if (!open && textMode) setSearch('');
              setOpen(true);
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveId(undefined);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && expanded) {
                event.preventDefault();
                event.stopPropagation();
                dismiss();
              } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setOpen(true);
                if (availableOptions.length === 0) return;
                const currentIndex = availableOptions.findIndex(
                  (option) => option.id === activeOptionId,
                );
                const nextIndex =
                  event.key === 'ArrowDown'
                    ? (currentIndex + 1) % availableOptions.length
                    : currentIndex < 0
                      ? availableOptions.length - 1
                      : (currentIndex - 1 + availableOptions.length) %
                        availableOptions.length;
                const nextId = availableOptions[nextIndex]?.id;
                setActiveId(nextId);
                if (nextId)
                  requestAnimationFrame(() =>
                    document
                      .getElementById(`${listId}-${nextId}`)
                      ?.scrollIntoView({ block: 'nearest' }),
                  );
              } else if (event.key === 'Enter' && expanded) {
                event.preventDefault();
                if (activeOptionId) selectOption(activeOptionId);
              }
            }}
            placeholder={
              !textMode && selectedOptions.length > 0
                ? 'Add more…'
                : placeholder
            }
            type="text"
            value={inputValue}
          />
          {textMode && (
            <IconButton
              label={`Show ${label.toLocaleLowerCase()} options`}
              icon={<ChevronDown aria-hidden size={18} />}
              size="sm"
              disabled={disabled}
              aria-expanded={expanded}
              aria-controls={expanded ? listId : undefined}
              data-cy={`${dataCyPrefix}-toggle`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                input.current?.focus();
                if (expanded) dismiss();
                else {
                  setSearch('');
                  setOpen(true);
                }
              }}
            />
          )}
        </div>
        {expanded && (
          <div
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-high p-2 shadow-raised"
            data-cy={`${dataCyPrefix}-dropdown`}
          >
            <ul
              id={listId}
              role="listbox"
              aria-label={listLabel}
              aria-multiselectable={multiple}
              data-cy={testIds?.list ?? `${dataCyPrefix}-options`}
            >
              {visibleOptions.map((option) => {
                const selected =
                  !option.disabled && selectedIds.includes(option.id);
                return (
                  <li role="presentation" key={option.id}>
                    <button
                      type="button"
                      role="option"
                      id={`${listId}-${option.id}`}
                      aria-selected={selected}
                      aria-disabled={option.disabled || undefined}
                      disabled={option.disabled}
                      tabIndex={-1}
                      data-cy={`${testIds?.optionPrefix ?? `${dataCyPrefix}-option`}-${option.id}`}
                      className={[
                        'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border-0 px-3 py-2 text-left text-on-surface outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors',
                        selected
                          ? 'bg-on-surface/8 hover:bg-on-surface/12'
                          : 'hover:bg-on-surface/8',
                        activeOptionId === option.id ? 'bg-on-surface/12' : '',
                      ].join(' ')}
                      onMouseDown={(event) => event.preventDefault()}
                      onPointerMove={() => {
                        if (!option.disabled) setActiveId(option.id);
                      }}
                      onClick={() => selectOption(option.id)}
                    >
                      {!textMode && (
                        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary-container text-on-secondary-container">
                          {!!option.imageUrl && (
                            <img
                              alt=""
                              className="size-full object-cover"
                              src={option.imageUrl}
                            />
                          )}
                          {!option.imageUrl && (
                            <UserRound aria-hidden size={18} />
                          )}
                        </span>
                      )}
                      <Text
                        as="span"
                        className="min-w-0 flex-1 break-words"
                        variant="label"
                        color="inherit"
                      >
                        {option.label}
                      </Text>
                      {!!option.disabledReason && (
                        <Text
                          as="span"
                          className="shrink-0"
                          color="muted"
                          data-cy={`${testIds?.disabledPrefix ?? `${dataCyPrefix}-disabled`}-${option.id}`}
                          variant="caption"
                        >
                          {option.disabledReason}
                        </Text>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {loading && (
              <LoadingIndicator
                label={`Loading ${label.toLocaleLowerCase()}`}
                size={36}
              />
            )}
            {!loading && !!loadError && (
              <div className="grid gap-2 p-2" role="alert">
                <Text color="error">{loadError}</Text>
                {!!onRetry && (
                  <Button onClick={onRetry} size="sm" variant="outline">
                    Retry
                  </Button>
                )}
              </div>
            )}
            {!loading && !loadError && visibleOptions.length === 0 && (
              <Text className="p-2" color="muted" role="status">
                {normalizedSearch ? noResultsMessage : emptyMessage}
              </Text>
            )}
          </div>
        )}
      </div>
      {!!error && (
        <Text
          id={errorId}
          className="mt-2"
          variant="caption"
          color="error"
          role="alert"
        >
          {error}
        </Text>
      )}
    </div>
  );
};
