import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import type { Invitation, Role } from '@/generated/prisma';

interface CreateInvitationRequest {
  email: string;
  role?: Role;
  domainId?: string;
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationData: CreateInvitationRequest) => {
      const { data } = await apiClient.post<{ invitation: Invitation }>('/invitations', invitationData);
      return data.invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccessToast('Invitation sent successfully');
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send invitation';
      showErrorToast(errorMessage);
    },
  });
}
