import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedApiClient } from '@/lib/api/client';
import type { User, Role, Domain, CandidateExperience, CandidateEducation, CandidateCertification } from '@/generated/prisma';

interface UpdateUserRequest {
  role?: Role;
  domainId?: string | null;
}

export interface CurrentUser extends User {
  domain: Domain | null;
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await typedApiClient.get<User[]>('/users');
      return res.data;
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const res = await typedApiClient.get<CurrentUser>('/users/me');
      return res.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const res = await typedApiClient.get<User>(`/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...userData }: UpdateUserRequest & { id: string }) => {
      const res = await typedApiClient.patch<User>(`/users/${id}`, userData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
