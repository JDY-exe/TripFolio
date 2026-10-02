import { flightWizardSteps } from './flightWizard';
import type { FlightWizardStep } from './flightWizard';

interface FlightWizardStepperProps {
  currentStep: FlightWizardStep;
}

/**
 * Shows the flight wizard's read-only progress on mobile and desktop.
 * @param props - Current step in the flight preview.
 * @returns An accessible step list with a compact mobile indicator.
 */
const FlightWizardStepper = ({ currentStep }: FlightWizardStepperProps) => (
  <nav aria-label="Flight form progress">
    <div className="sm:hidden">
      <p className="text-sm font-medium text-on-surface-variant">
        Step {currentStep + 1} of {flightWizardSteps.length} ·{' '}
        {flightWizardSteps[currentStep].label}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{
            width: `${((currentStep + 1) / flightWizardSteps.length) * 100}%`,
          }}
        />
      </div>
    </div>
    <ol className="hidden grid-cols-4 gap-2 sm:grid">
      {flightWizardSteps.map(({ label, value }) => (
        <li
          key={label}
          aria-current={currentStep === value ? 'step' : undefined}
          className="flex items-center gap-2"
        >
          <span
            className={[
              'grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium',
              currentStep === value
                ? 'bg-primary text-on-primary'
                : currentStep > value
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-high text-on-surface-variant',
            ].join(' ')}
          >
            {value + 1}
          </span>
          <span
            className={
              currentStep === value
                ? 'text-sm font-medium text-on-surface'
                : 'text-sm text-on-surface-variant'
            }
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  </nav>
);

export default FlightWizardStepper;
