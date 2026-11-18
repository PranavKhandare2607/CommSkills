import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@workspace/api-client-react";

export interface SubscriptionData {
  plan: string;
  status: string;
  isPremium: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string;
  trialDays: number;
  usage: {
    grammar: number;
    vocabulary: number;
    aiMessages: number;
    speaking: number;
  };
  limits: {
    grammar: number;
    vocabulary: number;
    aiMessages: number;
    speaking: number;
  };
}

export function useSubscription() {
  return useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/subscription"), { credentials: "include" });
      if (res.status === 401) return null as unknown as SubscriptionData;
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}
