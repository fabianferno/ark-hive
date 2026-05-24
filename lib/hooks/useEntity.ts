// lib/hooks/useEntity.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryFilter } from "@/lib/arkiv/types";
import type { Repository } from "@/lib/arkiv/repo";

export function useEntityList<T extends object>(
  repo: Repository<T>, queryKey: string, filters: QueryFilter[] = [],
) {
  return useQuery({
    queryKey: [queryKey, filters],
    queryFn: () => repo.query(filters),
  });
}

export function useEntity<T extends object>(
  repo: Repository<T>, queryKey: string, key: string,
) {
  return useQuery({ queryKey: [queryKey, "one", key], queryFn: () => repo.get(key) });
}

export function useCreate<T extends object>(
  repo: Repository<T>, queryKey: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: T) => repo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });
}

export function useUpdate<T extends object>(
  repo: Repository<T>, queryKey: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, patch }: { key: string; patch: Partial<T> }) => repo.update(key, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });
}

export function useDelete<T extends object>(
  repo: Repository<T>, queryKey: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => repo.delete(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });
}
