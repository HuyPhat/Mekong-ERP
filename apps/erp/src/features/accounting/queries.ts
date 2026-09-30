import { useQuery } from '@tanstack/react-query';
import {
  fetchChartOfAccounts,
  fetchGeneralLedger,
  fetchTrialBalance,
  fetchArAging,
  fetchApAging,
} from '@mekong-erp/contract';

export const accountingKeys = {
  chartOfAccounts: () => ['chart-of-accounts'] as const,
  generalLedger: (accountCode: string) => ['general-ledger', accountCode] as const,
  trialBalance: () => ['trial-balance'] as const,
  arAging: () => ['ar-aging'] as const,
  apAging: () => ['ap-aging'] as const,
};

export function useChartOfAccounts() {
  return useQuery({
    queryKey: accountingKeys.chartOfAccounts(),
    queryFn: fetchChartOfAccounts,
  });
}

export function useGeneralLedger(accountCode: string) {
  return useQuery({
    queryKey: accountingKeys.generalLedger(accountCode),
    queryFn: () => fetchGeneralLedger(accountCode),
    enabled: accountCode.length > 0,
  });
}

export function useTrialBalance() {
  return useQuery({
    queryKey: accountingKeys.trialBalance(),
    queryFn: fetchTrialBalance,
  });
}

export function useArAging() {
  return useQuery({
    queryKey: accountingKeys.arAging(),
    queryFn: fetchArAging,
  });
}

export function useApAging() {
  return useQuery({
    queryKey: accountingKeys.apAging(),
    queryFn: fetchApAging,
  });
}
