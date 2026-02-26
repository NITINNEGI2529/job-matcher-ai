import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

interface UpdateProfileRequest {
  skills: string[];
}

interface UpdateProfileResponse {
  profile: {
    userId: string;
    skills: string[];
    applicationsUpdated: number;
  };
}

/**
 * Hook for updating candidate profile
 * - Calls PATCH /api/profile
 * - Invalidates profile and applications query cache on success
 * - Shows success toast on completion
 * - Returns error state for form display
 * 
 * Requirements: 2.3, 2.4, 15.1, 15.2
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileData: UpdateProfileRequest) => {
      const { data } = await apiClient.patch<UpdateProfileResponse>('/profile', profileData);
      return data.profile;
    },
    onSuccess: () => {
      // Invalidate profile and applications query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      
      // Show success toast
      showSuccessToast('Profile updated successfully');
    },
    onError: (error: unknown) => {
      // Show error toast with appropriate message
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update profile';
      showErrorToast(errorMessage);
    },
  });
}
