import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../components/button';
import { cn } from '../lib/cn';

export interface WizardStep {
  id: string;
  title: string;
}

export interface WizardProps {
  steps: WizardStep[];
  currentStepIndex: number;
  children: ReactNode;
  className?: string;
}

type StepStatus = 'done' | 'current' | 'upcoming';

export function Wizard({ steps, currentStepIndex, children, className }: WizardProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => {
          const status: StepStatus =
            index < currentStepIndex ? 'done' : index === currentStepIndex ? 'current' : 'upcoming';
          return (
            <li key={step.id} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true" className="h-px w-6 bg-border" />}
              <span
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium',
                  status === 'done' && 'border-success/30 bg-success/10 text-success',
                  status === 'current' && 'border-accent bg-accent/10 text-accent',
                  status === 'upcoming' && 'border-border text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs',
                    status === 'done' && 'bg-success text-background',
                    status === 'current' && 'bg-accent text-accent-foreground',
                    status === 'upcoming' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {status === 'done' ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>
      <div>{children}</div>
    </div>
  );
}

export interface WizardFooterLabels {
  back: string;
  next: string;
  submit: string;
}

export const defaultWizardFooterLabels: WizardFooterLabels = {
  back: 'Back',
  next: 'Next',
  submit: 'Submit',
};

export interface WizardFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
  nextDisabled?: boolean;
  labels?: WizardFooterLabels;
}

export function WizardFooter({
  onBack,
  onNext,
  onSubmit,
  isFirstStep,
  isLastStep,
  isSubmitting = false,
  nextDisabled = false,
  labels = defaultWizardFooterLabels,
}: WizardFooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
      >
        {labels.back}
      </Button>
      {isLastStep ? (
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          {labels.submit}
        </Button>
      ) : (
        <Button type="button" onClick={onNext} disabled={nextDisabled || isSubmitting}>
          {labels.next}
        </Button>
      )}
    </div>
  );
}

export interface WizardDraftBannerLabels {
  message: string;
  resume: string;
  discard: string;
}

export const defaultWizardDraftBannerLabels: WizardDraftBannerLabels = {
  message: 'You have an unsaved draft.',
  resume: 'Resume',
  discard: 'Discard',
};

export interface WizardDraftBannerProps {
  onResume: () => void;
  onDiscard: () => void;
  labels?: WizardDraftBannerLabels;
  className?: string;
}

export function WizardDraftBanner({
  onResume,
  onDiscard,
  labels = defaultWizardDraftBannerLabels,
  className,
}: WizardDraftBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent',
        className,
      )}
    >
      <span>{labels.message}</span>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
          {labels.discard}
        </Button>
        <Button type="button" size="sm" onClick={onResume}>
          {labels.resume}
        </Button>
      </div>
    </div>
  );
}
