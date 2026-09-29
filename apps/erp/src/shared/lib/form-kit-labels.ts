import type { TFunction } from 'i18next';
import type {
  WizardFooterLabels,
  WizardDraftBannerLabels,
  LineItemsTableLabels,
} from '@mekong-erp/ui';

export function buildWizardFooterLabels(t: TFunction): WizardFooterLabels {
  return {
    back: t('wizard.back'),
    next: t('wizard.next'),
    submit: t('wizard.submit'),
  };
}

export function buildWizardDraftBannerLabels(t: TFunction): WizardDraftBannerLabels {
  return {
    message: t('wizard.draftMessage'),
    resume: t('wizard.resume'),
    discard: t('wizard.discard'),
  };
}

export function buildLineItemsTableLabels(t: TFunction): LineItemsTableLabels {
  return {
    addLine: t('lineItems.addLine'),
    removeLine: t('lineItems.removeLine'),
    empty: t('lineItems.empty'),
  };
}
