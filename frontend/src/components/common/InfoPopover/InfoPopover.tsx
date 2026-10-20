import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import IconButton from '../IconButton';
import Text from '../Text';

export interface InfoPopoverProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Shows supporting information from a question-mark button without changing form state.
 * @param props - Accessible trigger label, explanatory content, and wrapper classes.
 * @returns A disclosure dismissed by its trigger, outside interaction, focus leaving, or Escape.
 */
export const InfoPopover = ({
  label,
  children,
  className,
}: InfoPopoverProps) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    /** Closes the disclosure when a pointer lands outside its wrapper. */
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !wrapper.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [open]);

  return (
    <div
      ref={wrapper}
      className={['relative inline-flex shrink-0', className]
        .filter(Boolean)
        .join(' ')}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          wrapper.current?.querySelector('button')?.focus();
        }
      }}
    >
      <IconButton
        label={label}
        icon={<CircleHelp aria-hidden size={18} />}
        size="sm"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <div
          id={id}
          className="absolute top-full right-0 z-20 mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-outline-variant bg-surface-container-high p-4 shadow-lg"
        >
          <Text variant="body">{children}</Text>
        </div>
      )}
    </div>
  );
};
