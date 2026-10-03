export interface StepperStep {
  label: string;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  currentStep: number;
  label: string;
  className?: string;
}

/**
 * Shows read-only progress through an ordered set of steps.
 * @param props - Step labels, the zero-based active index, and a navigation label.
 * @returns A compact mobile progress bar and a numbered desktop step list.
 */
const Stepper = ({ steps, currentStep, label, className }: StepperProps) => {
  if (steps.length === 0) return null;

  return (
    <nav aria-label={label} className={className}>
      <div className="sm:hidden">
        <p className="text-sm font-medium text-on-surface-variant">
          Step {currentStep + 1} of {steps.length} · {steps[currentStep]?.label}
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol
        className="hidden gap-2 sm:grid"
        style={{
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        }}
      >
        {steps.map(({ label: stepLabel }, index) => (
          <li
            key={index}
            aria-current={currentStep === index ? 'step' : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={[
                'grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium',
                currentStep === index
                  ? 'bg-primary text-on-primary'
                  : currentStep > index
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant',
              ].join(' ')}
            >
              {index + 1}
            </span>
            <span
              className={
                currentStep === index
                  ? 'text-sm font-medium text-on-surface'
                  : 'text-sm text-on-surface-variant'
              }
            >
              {stepLabel}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Stepper;
