import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

type ApplicationStatus = 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';

interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  domainId: string;
  createdAt: string;
  updatedAt: string;
}

interface Application {
  id: string;
  jobId: string;
  userId: string;
  candidateSkills: string[];
  matchingScore: number | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

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
      const { data } = await apiClient.get<{ applications: Application[] }>(`/jobs/${jobId}/applications`);
      return data.applications;
    },
    enabled: !!jobId,
  });
}
