"use client";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useUserWallet } from "@/lib/wallet/useUserWallet";
import { braga } from "@/lib/wallet/chains";

function formatGlm(wei: bigint): string {
  const n = Number(formatEther(wei));
  if (n === 0) return "0";
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

export function useWalletBalance() {
  const { address, publicArkiv } = useUserWallet();
  const symbol = braga.nativeCurrency.symbol;

  const query = useQuery({
    queryKey: ["wallet-balance", address],
    enabled: !!address,
    queryFn: () => publicArkiv.getBalance({ address: address! }),
    refetchInterval: 30_000,
  });

  const formatted =
    query.data !== undefined ? `${formatGlm(query.data)} ${symbol}` : null;

  return { ...query, formatted, symbol };
}
