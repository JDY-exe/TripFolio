import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import Button from '../Button';
import Text from '../Text';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
const fadeDuration = 200;

export interface ModalProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'title'
> {
  /** Whether the modal is visible or transitioning out. */
  open: boolean;
  /** Accessible and visible modal heading. */
  title: ReactNode;
  /** Optional supporting copy shown beneath the heading. */
  description?: ReactNode;
  /** Requests that the parent close the controlled modal. */
  onClose: () => void;
  /** Main modal content. */
  children: ReactNode;
  /** Optional action row displayed beneath the content. */
  footer?: ReactNode;
}

/**
 * Returns the enabled interactive elements that can participate in the modal's
 * keyboard focus loop. Querying at keypress time accounts for changing content.
 *
 * @param container - Mounted modal panel whose descendants are inspected.
 * @returns Focusable HTML elements in document order.
 */
function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
}

/**
 * Renders an in-tree modal overlay without a portal. It fades in and remains
 * mounted long enough to fade out, restores focus after closing, closes on
 * Escape or backdrop press, and loops keyboard focus while visible.
 *
 * @param props - Controlled visibility, content, close callback, and attributes.
 * @returns A fixed high-z modal overlay when open, otherwise nothing.
 */
function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
  onKeyDown,
  onMouseDown,
  ...props
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    if (open) {
      if (shouldRender) return;
      const frame = window.requestAnimationFrame(() => setShouldRender(true));
      return () => window.cancelAnimationFrame(frame);
    }

    if (!shouldRender) return;
    const timeout = window.setTimeout(
      () => setShouldRender(false),
      fadeDuration,
    );
    return () => window.clearTimeout(timeout);
  }, [open, shouldRender]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const firstFocusable = panel ? getFocusableElements(panel)[0] : undefined;
    (firstFocusable ?? panel)?.focus();

    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, shouldRender]);

  if (!shouldRender) return null;

  /**
   * Dismisses only presses that begin on the backdrop rather than modal content.
   *
   * @param event - Pointer-originating mouse event on the full overlay.
   * @returns Nothing; the controlled close callback is requested when eligible.
   */
  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(event);
    if (event.defaultPrevented) return;
    if (event.target === event.currentTarget) onClose();
  };

  /**
   * Handles modal keyboard behavior by dismissing on Escape and wrapping Tab
   * navigation between the first and last enabled controls.
   *
   * @param event - Keyboard event raised from within the modal overlay.
   * @returns Nothing; focus or controlled visibility may be updated.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusableElements = getFocusableElements(panelRef.current);
    if (focusableElements.length === 0) {
      event.preventDefault();
      panelRef.current.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      {...props}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      aria-modal="true"
      className={[
        'fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-on-surface/45 p-4 backdrop-blur-sm transition-opacity duration-200 ease-standard motion-reduce:transition-none sm:p-8',
        open ? 'modal-enter opacity-100' : 'pointer-events-none opacity-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onKeyDown={handleKeyDown}
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
    >
      <div
        ref={panelRef}
        className="w-full max-w-xl rounded-3xl bg-surface-container p-5 text-on-surface sm:p-7"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-6">
          <div>
            <Text as="h2" id={titleId} variant="title">
              {title}
            </Text>
            {description ? (
              <Text className="mt-1 max-w-md" color="muted" id={descriptionId}>
                {description}
              </Text>
            ) : null}
          </div>
          <Button
            leadingIcon={<X size={18} />}
            onClick={onClose}
            size="sm"
            variant="ghost"
          >
            Close
          </Button>
        </header>

        <div className="mt-6">{children}</div>

        {footer ? (
          <footer className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export default Modal;
