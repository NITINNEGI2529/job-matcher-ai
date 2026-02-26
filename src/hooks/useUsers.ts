import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'RECRUITER' | 'CANDIDATE';

interface User {
  id: string; // Clerk ID
  email: string;
  role: Role;
  domainId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UpdateUserRequest {
  role?: Role;
  domainId?: string | null;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ users: User[] }>('/users');
      return data.users;
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ user: User }>('/users/me');
      return data.user;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ user: User }>(`/users/${id}`);
      return data.user;
    },
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...userData }: UpdateUserRequest & { id: string }) => {
      const { data } = await apiClient.patch<{ user: User }>(`/users/${id}`, userData);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
