import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Wizard, WizardDraftBanner, WizardFooter, type WizardStep } from './wizard';

const STEPS: WizardStep[] = [
  { id: 'supplier', title: 'Supplier' },
  { id: 'lines', title: 'Lines' },
  { id: 'delivery', title: 'Delivery & terms' },
  { id: 'review', title: 'Review' },
];

function WizardDemo({ startAt = 0, showDraftBanner = false }: WizardDemoProps) {
  const [step, setStep] = useState(startAt);
  const [bannerVisible, setBannerVisible] = useState(showDraftBanner);
  const current = STEPS[step];

  return (
    <div className="w-[640px]">
      {bannerVisible && (
        <WizardDraftBanner
          className="mb-4"
          onResume={() => setBannerVisible(false)}
          onDiscard={() => setBannerVisible(false)}
        />
      )}
      <Wizard steps={STEPS} currentStepIndex={step}>
        <div className="flex min-h-32 flex-col gap-2 rounded-md border border-border p-4">
          <p className="text-sm font-medium">{current?.title}</p>
          <Input
            aria-label={`${current?.title ?? 'Step'} field`}
            placeholder="Field for this step"
          />
        </div>
      </Wizard>
      <div className="mt-4">
        <WizardFooter
          isFirstStep={step === 0}
          isLastStep={step === STEPS.length - 1}
          onBack={() => setStep((value) => Math.max(0, value - 1))}
          onNext={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
          onSubmit={() => undefined}
        />
      </div>
    </div>
  );
}

interface WizardDemoProps {
  startAt?: number;
  showDraftBanner?: boolean;
}

const meta = {
  title: 'Form/Wizard',
  component: WizardDemo,
  tags: ['autodocs'],
} satisfies Meta<typeof WizardDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {};

export const MiddleStep: Story = { args: { startAt: 2 } };

export const ResumeADraft: Story = { args: { startAt: 1, showDraftBanner: true } };
