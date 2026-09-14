import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
  getButtonClasses,
  type ButtonVariant,
  type ControlSize,
} from '../styles/componentStyles';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

/**
 * Renders the standard TripFolio action control.
 * Native button behavior is preserved while semantic variant and size tokens
 * provide consistent color, spacing, focus, motion, and disabled states.
 *
 * @param props - Native button attributes and TripFolio presentation tokens.
 * @param props.variant - Semantic color treatment for the action.
 * @param props.size - Control height and horizontal spacing scale.
 * @param props.fullWidth - Whether the button fills its available width.
 * @param props.leadingIcon - Decorative or semantic content before the label.
 * @param props.trailingIcon - Decorative or semantic content after the label.
 * @returns A tokenized native button.
 */
function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={getButtonClasses(variant, size, fullWidth, className)}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

export default Button;
