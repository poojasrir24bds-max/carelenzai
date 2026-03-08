import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  hasPendingSubscription: boolean;
  subscription: any | null;
  plan: any | null;
  loading: boolean;
  scansRemaining: number;
  consultationsRemaining: number;
}

export const useSubscription = (): SubscriptionStatus => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    hasPendingSubscription: false,
    subscription: null,
    plan: null,
    loading: true,
    scansRemaining: 0,
    consultationsRemaining: 0,
  });

  useEffect(() => {
    if (!user) {
      setState(s => ({ ...s, loading: false }));
      return;
    }

    const fetch = async () => {
      // Check for active subscription
      const { data } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.subscription_plans) {
        const plan = data.subscription_plans as any;
        setState({
          hasActiveSubscription: true,
          hasPendingSubscription: false,
          subscription: data,
          plan,
          loading: false,
          scansRemaining: Math.max(0, (plan.scan_limit || 0) - (data.scans_used || 0)),
          consultationsRemaining: Math.max(0, (plan.doctor_consultations || 0) - (data.consultations_used || 0)),
        });
      } else {
        // Check for pending subscription
        const { data: pending } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        setState({
          hasActiveSubscription: false,
          hasPendingSubscription: !!pending,
          subscription: null,
          plan: null,
          loading: false,
          scansRemaining: 0,
          consultationsRemaining: 0,
        });
      }
    };

    fetch();
  }, [user]);

  return state;
};
