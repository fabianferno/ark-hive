// lib/hooks/useEntityWatch.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryFilter } from "@/lib/arkiv/types";
import type { Repository } from "@/lib/arkiv/repo";

export function useEntityWatch<T extends object>(
  repo: Repository<T>, queryKey: string, filters: QueryFilter[] = [],
) {
  const qc = useQueryClient();
  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });
    const unsub = repo.watch(filters, { onCreated: invalidate, onUpdated: invalidate, onDeleted: invalidate });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, queryKey, JSON.stringify(filters)]);
}
