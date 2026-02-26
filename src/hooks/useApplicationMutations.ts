import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import type { ApplicationStatus } from '@/generated/prisma';

interface Application {
  id: string;
  jobId: string;
  userId: string;
  candidateSkills: string[];
  matchingScore: number | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

interface CreateApplicationRequest {
  jobId: string;
  candidateSkills: string[];
}

/**
 * Hook for creating a new job application
 * - Calls POST /api/applications
 * - Invalidates applications query cache on success
 * - Shows success toast on completion
 * - Returns error state for form display
 * 
 * Requirements: 3.2, 3.4, 15.1, 15.2
 */
export function useCreateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (applicationData: CreateApplicationRequest) => {
      const { data } = await apiClient.post<{ application: Application }>('/applications', applicationData);
      return data.application;
    },
    onSuccess: () => {
      // Invalidate applications query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      
      // Show success toast
      showSuccessToast('Application submitted successfully');
    },
    onError: (error: unknown) => {
      // Show error toast with appropriate message
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit application';
      showErrorToast(errorMessage);
    },
  });
}

/**
 * Hook for updating application status
 * - Calls PATCH /api/applications/[id]/status
 * - Invalidates applications query cache on success
 * - Shows success toast on completion
 * - Returns error state for form display
 * 
 * Requirements: 7.4, 7.7, 15.1, 15.2
 */
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) => {
      const { data } = await apiClient.patch<{ application: Application }>(
        `/applications/${applicationId}/status`,
        { status }
      );
      return data.application;
    },
    onSuccess: () => {
      // Invalidate applications query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      
      // Show success toast
      showSuccessToast('Application status updated successfully');
    },
    onError: (error: unknown) => {
      // Show error toast with appropriate message
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update application status';
      showErrorToast(errorMessage);
    },
  });
}
