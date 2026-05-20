import { useQuery } from '@tanstack/react-query';
import { typedApiClient } from '@/lib/api/client';
import type { Application, Job, User } from '@/generated/prisma';

// API response types that extend Prisma types with relations
type ApplicationWithRelations = Application & {
  job?: Pick<Job, 'id' | 'title' | 'description' | 'requiredSkills' | 'domainId'>;
  user?: Pick<User, 'id' | 'email' | 'role' | 'skills'>;
};



interface ApplicationScore {
  applicationId: string;
  matchingScore: number;
  commonSkills: string[];
  totalRequiredSkills: number;
}


export function useApplication(id: string) {
  return useQuery({
    queryKey: ['applications', id],
    queryFn: async () => {
      const res = await typedApiClient.get<ApplicationWithRelations>(`/applications/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}


export function useApplicationScore(id: string) {
  return useQuery({
    queryKey: ['applications', id, 'score'],
    queryFn: async () => {
      const res = await typedApiClient.get<ApplicationScore>(`/applications/${id}/score`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await typedApiClient.get<ApplicationWithRelations[]>('/applications');
      return res.data;
    },
  });
}

export function useUserApplications(userId: string) {
  return useQuery({
    queryKey: ['applications', { userId }],
    queryFn: async () => {
      const res = await typedApiClient.get<ApplicationWithRelations[]>(`/applications?userId=${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });
}
