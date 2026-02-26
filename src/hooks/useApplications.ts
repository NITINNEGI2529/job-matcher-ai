import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

type ApplicationStatus = 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';

interface Application {
  id: string;
  jobId: string;
  userId: string;
  candidateSkills: string[];
  matchingScore: number | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    description: string;
    requiredSkills: string[];
    domainId: string;
  };
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface CreateApplicationRequest {
  jobId: string;
  candidateSkills: string[];
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
      const { data } = await apiClient.post<{ application: Application }>('/applications', applicationData);
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
      const { data } = await apiClient.get<{ application: Application }>(`/applications/${id}`);
      return data.application;
    },
    enabled: !!id,
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateApplicationRequest & { id: string }) => {
      const { data } = await apiClient.patch<{ application: Application }>(`/applications/${id}`, updateData);
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
      const { data } = await apiClient.get<{ applications: Application[] }>('/applications');
      return data.applications;
    },
  });
}
