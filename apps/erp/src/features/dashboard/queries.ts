import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '@mekong-erp/contract';

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  });
}
