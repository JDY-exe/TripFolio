import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import IconButton from '../IconButton';

export interface DropdownMenuItem {
  /** Visible action name and accessible menu item text. */
  label: string;
  /** Optional icon shown before the action name. */
  icon?: ReactNode;
  /** Applies the error color treatment to destructive actions. */
  tone?: 'default' | 'danger';
  /** Runs after the menu closes when the item is selected. */
  onSelect: () => void;
}

export interface DropdownMenuProps {
  /** Accessible name for the icon-only menu trigger. */
  label: string;
  /** Icon shown inside the menu trigger. */
  icon: ReactNode;
  /** Actions rendered in the menu. */
  items: readonly DropdownMenuItem[];
  /** Optional classes applied to the positioned menu wrapper. */
  className?: string;
}

/**
 * Renders a reusable, keyboard-accessible action menu with a tonal surface.
 * It manages menu focus, arrow-key navigation, Escape, and outside dismissal.
 *
 * @param props - Trigger details, menu actions, and optional wrapper classes.
 * @returns An icon button and its conditionally rendered action menu.
 */
const DropdownMenu = ({ label, icon, items, className }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusIndexRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;

    /** Dismisses the menu when a pointer press lands outside its wrapper. */
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    /** Places the portal below its trigger, flipping and clamping to the viewport. */
    const positionMenu = () => {
      const trigger = rootRef.current?.querySelector('button');
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      menu.style.visibility = 'hidden';
      menu.style.position = 'fixed';

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gutter = 8;
      const belowTop = triggerRect.bottom + gutter;
      const top =
        belowTop + menuRect.height <= window.innerHeight - gutter
          ? belowTop
          : Math.max(gutter, triggerRect.top - menuRect.height - gutter);
      const maxLeft = Math.max(
        gutter,
        window.innerWidth - menuRect.width - gutter,
      );
      const left = Math.max(
        gutter,
        Math.min(triggerRect.right - menuRect.width, maxLeft),
      );

      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.visibility = 'visible';
    };

    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const menuItems =
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (!menuItems?.length) return;
    const focusIndex = focusIndexRef.current ?? 0;
    menuItems[Math.min(focusIndex, menuItems.length - 1)]?.focus();
    focusIndexRef.current = undefined;
  }, [isOpen]);

  /**
   * Opens the menu and focuses the requested menu item after rendering.
   * @param focusIndex - Menu item index to focus, defaulting to the first item.
   * @returns Nothing.
   */
  const openMenu = (focusIndex = 0) => {
    focusIndexRef.current = focusIndex;
    setIsOpen(true);
  };

  /**
   * Closes the menu and optionally returns focus to its trigger.
   * @param restoreFocus - Whether to return keyboard focus to the trigger.
   * @returns Nothing.
   */
  const closeMenu = (restoreFocus: boolean) => {
    setIsOpen(false);
    if (restoreFocus) rootRef.current?.querySelector('button')?.focus();
  };

  /**
   * Handles menu arrow navigation, Home and End, Escape, and Tab behavior.
   * @param event - Keyboard event originating within the menu.
   * @returns Nothing.
   */
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ),
    );
    const currentIndex = menuItems.indexOf(
      document.activeElement as HTMLButtonElement,
    );

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key === 'Tab') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!menuItems.length) return;
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + menuItems.length) % menuItems.length;
      menuItems[nextIndex]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      menuItems[event.key === 'Home' ? 0 : menuItems.length - 1]?.focus();
    }
  };

  /**
   * Closes the menu before running the selected action.
   * @param item - Action selected by the user.
   * @returns Nothing.
   */
  const selectItem = (item: DropdownMenuItem) => {
    closeMenu(true);
    item.onSelect();
  };

  return (
    <div
      ref={rootRef}
      className={['relative inline-flex', className].filter(Boolean).join(' ')}
    >
      <IconButton
        label={label}
        icon={icon}
        disabled={items.length === 0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => (isOpen ? closeMenu(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu(0);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(items.length - 1);
          }
        }}
      />
      {isOpen
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              onKeyDown={handleMenuKeyDown}
              className="invisible fixed z-[100] max-h-[calc(100dvh-1rem)] min-w-40 max-w-[calc(100vw-1rem)] origin-top-right overflow-y-auto rounded-3xl border border-outline-variant bg-surface-container-high p-1 shadow-raised motion-safe:animate-[menu-enter_120ms_var(--ease-standard)]"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => selectItem(item)}
                  className={`flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-full px-3 text-left text-label outline-none transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                    item.tone === 'danger'
                      ? 'text-error hover:bg-error/10 focus-visible:bg-error/10'
                      : 'text-on-surface hover:bg-primary/8 focus-visible:bg-primary/8'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default DropdownMenu;
