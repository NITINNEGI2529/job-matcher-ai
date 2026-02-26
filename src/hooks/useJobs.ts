import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { Job, Application, User } from '@/generated/prisma';

// API response types that extend Prisma types with relations
type ApplicationWithUser = Application & {
  user?: Pick<User, 'id' | 'email' | 'role'>;
};

interface CreateJobRequest {
  title: string;
  description: string;
  requiredSkills: string[];
}

interface UpdateJobRequest {
  title?: string;
  description?: string;
  requiredSkills?: string[];
}

export function useJobs(domainId?: string) {
  return useQuery({
    queryKey: ['jobs', domainId],
    queryFn: async () => {
      const params = domainId ? { domainId } : {};
      const { data } = await apiClient.get<{ jobs: Job[] }>('/jobs', { params });
      return data.jobs;
    },
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ job: Job }>(`/jobs/${id}`);
      return data.job;
    },
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (jobData: CreateJobRequest) => {
      const { data } = await apiClient.post<{ job: Job }>('/jobs', jobData);
      return data.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateJobRequest & { id: string }) => {
      const { data } = await apiClient.patch<{ job: Job }>(`/jobs/${id}`, updateData);
      return data.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<{ success: boolean }>(`/jobs/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useJobApplications(jobId: string) {
  return useQuery({
    queryKey: ['jobs', jobId, 'applications'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ applications: ApplicationWithUser[] }>(`/jobs/${jobId}/applications`);
      return data.applications;
    },
    enabled: !!jobId,
  });
}
