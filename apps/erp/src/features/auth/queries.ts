import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { fetchSession, loginAs, logout } from '@mekong-erp/contract';

export const sessionKeys = {
  all: ['session'] as const,
};

export function sessionQueryOptions() {
  return {
    queryKey: sessionKeys.all,
    queryFn: fetchSession,
  };
}

export function useSession() {
  return useQuery(sessionQueryOptions());
}

export function ensureSession(queryClient: QueryClient) {
  return queryClient.ensureQueryData(sessionQueryOptions());
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginAs,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionKeys.all, session);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionKeys.all, session);
    },
  });
}
