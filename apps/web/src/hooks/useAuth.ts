"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me().then(r => r.data.data),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  return { user: data, isLoading, isAuthenticated: !!data, error };
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => { qc.clear(); router.push("/login"); },
  });
}
