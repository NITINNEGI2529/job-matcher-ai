import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedApiClient } from '@/lib/api/client';
import type { Application, ApplicationStatus, Job, User } from '@/generated/prisma';

// API response types that extend Prisma types with relations
type ApplicationWithRelations = Application & {
  job?: Pick<Job, 'id' | 'title' | 'description' | 'requiredSkills' | 'domainId'>;
  user?: Pick<User, 'id' | 'email' | 'role' | 'skills'>;
};

interface CreateApplicationRequest {
  jobId: string;
}

interface UpdateApplicationRequest {
  status?: ApplicationStatus;
}

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
