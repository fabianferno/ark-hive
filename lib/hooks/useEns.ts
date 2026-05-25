// lib/hooks/useEns.ts
// React Query hooks for ENS availability checks, claiming, and fetching the
// current user's ENS name. Reads hit /api/ens/* routes via the browser client.
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserWallet } from "@/lib/wallet/useUserWallet";
import { checkAvailability, claimUserEns, getMyEns } from "@/lib/ens/client";

/** Return the ENS name registered for the currently authenticated user. */
export function useMyEns() {
  const { authenticated, address } = useUserWallet();
  return useQuery({
    queryKey: ["myEns", address],
    enabled: authenticated && !!address,
    queryFn: () => getMyEns(address!),
  });
}

/** Reverse-lookup: the ENS name registered for ANY wallet address (or null). */
export function useEnsName(address?: string | null) {
  return useQuery({
    queryKey: ["ensByAddr", address?.toLowerCase()],
    enabled: !!address,
    queryFn: () => getMyEns(address!),
    staleTime: 60_000,
  });
}

/** Check whether a given label is available for registration. */
export function useEnsAvailability(label: string) {
  return useQuery({
    queryKey: ["ensAvail", label],
    enabled: label.trim().length >= 3,
    queryFn: () => checkAvailability(label),
  });
}

/** Mutation that claims a user-level ENS subdomain. Optimistically writes the new
 *  name into the myEns cache (so the modal closes + badges update instantly,
 *  without waiting on NameStone's eventually-consistent read), then refetches. */
export function useClaimEns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ label, address }: { label: string; address: string }) =>
      claimUserEns(label, address),
    onSuccess: (data, vars) => {
      queryClient.setQueryData(["myEns", vars.address], { ensName: data.ensName, label: data.label });
      queryClient.invalidateQueries({ queryKey: ["myEns"] });
      queryClient.invalidateQueries({ queryKey: ["ensByAddr"] });
    },
  });
}
