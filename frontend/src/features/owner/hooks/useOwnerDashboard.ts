import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../api/ownerApi.js';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['owner', 'dashboard-summary'],
    queryFn: getDashboardSummary,
  });
}
