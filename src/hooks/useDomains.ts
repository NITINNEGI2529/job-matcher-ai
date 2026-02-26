import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

interface Domain {
  id: string;
  name: string;
  domainName: string;
  publicKey: string | null;
  signature: string | null;
  verified: boolean;
  disabled: boolean;
  createdAt: string;
}

interface CreateDomainRequest {
  name: string;
  domainName: string;
  publicKey?: string;
  signature?: string;
}

interface UpdateDomainRequest {
  name?: string;
  publicKey?: string;
  signature?: string;
  verified?: boolean;
  disabled?: boolean;
}

export function useDomains() {
  return useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ domains: Domain[] }>('/domains');
      return data.domains;
    },
  });
}

export function useDomain(id: string) {
  return useQuery({
    queryKey: ['domains', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ domain: Domain }>(`/domains/${id}`);
      return data.domain;
    },
    enabled: !!id,
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (domainData: CreateDomainRequest) => {
      const { data } = await apiClient.post<{ domain: Domain }>('/domains', domainData);
      return data.domain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateDomainRequest & { id: string }) => {
      const { data } = await apiClient.patch<{ domain: Domain }>(`/domains/${id}`, updateData);
      return data.domain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<{ success: boolean; message: string }>(`/domains/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}
