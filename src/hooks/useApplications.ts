import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
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

export function useCreateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (applicationData: CreateApplicationRequest) => {
      const { data } = await apiClient.post<{ application: ApplicationWithRelations }>('/applications', applicationData);
      return data.application;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.jobId, 'applications'] });
    },
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['applications', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ application: ApplicationWithRelations }>(`/applications/${id}`);
      return data.application;
    },
    enabled: !!id,
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateApplicationRequest & { id: string }) => {
      const { data } = await apiClient.patch<{ application: ApplicationWithRelations }>(`/applications/${id}`, updateData);
      return data.application;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.jobId, 'applications'] });
    },
  });
}

export function useApplicationScore(id: string) {
  return useQuery({
    queryKey: ['applications', id, 'score'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApplicationScore>(`/applications/${id}/score`);
      return data;
    },
    enabled: !!id,
  });
}

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ applications: ApplicationWithRelations[] }>('/applications');
      return data.applications;
    },
  });
}
