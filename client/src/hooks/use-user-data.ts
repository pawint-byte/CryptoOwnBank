import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useUserData<T = any>(key: string, defaultValue: T) {
  const queryClient = useQueryClient();

  const query = useQuery<T>({
    queryKey: ["/api/user-data", key],
    queryFn: async () => {
      const res = await fetch(`/api/user-data/${key}`, { credentials: "include" });
      if (!res.ok) return defaultValue;
      const data = await res.json();
      return data.value ?? defaultValue;
    },
  });

  const mutation = useMutation({
    mutationFn: async (value: T) => {
      await apiRequest("PUT", `/api/user-data/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-data", key] });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/user-data/${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-data", key] });
    },
  });

  return {
    data: query.data ?? defaultValue,
    isLoading: query.isLoading,
    save: mutation.mutate,
    saveAsync: mutation.mutateAsync,
    remove: remove.mutate,
    isSaving: mutation.isPending,
  };
}
