import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Zap, ScanLine, Stethoscope, Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const planIcons: Record<string, any> = {
  Basic: Zap,
  Premium: Crown,
};

const planColors: Record<string, string> = {
  Basic: "border-primary/40 bg-primary/5",
  Premium: "border-yellow-500/40 bg-yellow-500/5",
};

const Subscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchPlans();
    if (user) fetchActiveSub();
  }, [user]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("subscription_plans" as any)
      .select("*")
      .eq("is_active", true)
      .neq("name", "Doctor Plan")
      .order("price_inr", { ascending: true });
    setPlans((data as any[]) || []);
  };

  const fetchActiveSub = async () => {
    const { data } = await supabase
      .from("user_subscriptions" as any)
      .select("*, subscription_plans(*)")
      .eq("user_id", user!.id)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1);
    setActiveSub((data as any[])?.[0] || null);
  };

  const handlePayWithRazorpay = async (plan: any) => {
    if (!user || paying) return;
    setPaying(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // Create order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('razorpay-create-order', {
        body: { plan_id: plan.id },
      });

      if (orderError || !orderData?.order_id) {
        throw new Error(orderError?.message || 'Failed to create order');
      }

      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CARELENZ AI',
        description: `${orderData.plan_name} Plan Subscription`,
        image: logo,
        order_id: orderData.order_id,
        prefill: orderData.prefill,
        theme: { color: '#2563eb' },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: plan.id,
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyError?.message || 'Payment verification failed');
            }

            toast({ title: "Payment Successful! ✅", description: "Your subscription is now active." });
            navigate("/patient");
          } catch (err: any) {
            toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Something went wrong",
          variant: "destructive",
        });
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/patient")} className="text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">{t("sub.title")}</span>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-6">
        {/* Active Subscription */}
        {activeSub && (
          <Card className={`shadow-elevated ${activeSub.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-success/30 bg-success/5'}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`rounded-full p-2 ${activeSub.status === 'pending' ? 'bg-yellow-500/20' : 'bg-success/20'}`}>
                  {activeSub.status === 'pending' ? (
                    <Crown className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <Check className="h-5 w-5 text-success" />
                  )}
                </div>
                <div>
                  <p className="font-display font-bold text-sm">
                    {activeSub.status === 'pending' ? 'Payment Under Review' : t("sub.activePlan")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeSub.subscription_plans?.name} • {activeSub.status === 'pending'
                      ? 'Waiting for admin approval'
                      : `${t("sub.expires")} ${new Date(activeSub.expires_at).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
              </div>
              {activeSub.status === 'active' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-background rounded-xl p-3 text-center">
                    <ScanLine className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-lg font-bold">{activeSub.scans_used}/{activeSub.subscription_plans?.scan_limit}</p>
                    <p className="text-xs text-muted-foreground">{t("sub.scansUsed")}</p>
                  </div>
                  <div className="bg-background rounded-xl p-3 text-center">
                    <Stethoscope className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-lg font-bold">{activeSub.consultations_used}/{activeSub.subscription_plans?.doctor_consultations}</p>
                    <p className="text-xs text-muted-foreground">{t("sub.consultationsUsed")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plans */}
        <div>
          <h2 className="font-display text-xl font-bold mb-1">{t("sub.choosePlan")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("sub.choosePlanDesc")}</p>

          <div className="space-y-4">
            {plans.map((plan: any) => {
              const Icon = planIcons[plan.name] || Zap;
              const colorClass = planColors[plan.name] || "border-border";
              const isPremium = plan.name === "Premium";

              return (
                <Card key={plan.id} className={`shadow-card border-2 ${colorClass} relative overflow-hidden`}>
                  {isPremium && (
                    <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                      ⭐ {t("sub.popular")}
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`rounded-full p-2.5 ${isPremium ? "bg-yellow-500/20" : "bg-primary/10"}`}>
                        <Icon className={`h-6 w-6 ${isPremium ? "text-yellow-600" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="font-display font-bold text-lg">{plan.name} {t("sub.plan")}</p>
                        <p className="text-2xl font-bold">
                          ₹{plan.price_inr}<span className="text-sm font-normal text-muted-foreground">/{t("sub.month")}</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success" />
                        <span>{plan.scan_limit} {t("sub.aiScans")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success" />
                        <span>{plan.doctor_consultations} {t("sub.doctorConsultations")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success" />
                        <span>{plan.duration_days} {t("sub.days")}</span>
                      </div>
                      {isPremium && (
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success" />
                          <span>{t("sub.prioritySupport")}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full rounded-xl"
                      variant={isPremium ? "default" : "outline"}
                      onClick={() => handlePayWithRazorpay(plan)}
                      disabled={paying}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {paying ? "Processing..." : `Pay ₹${plan.price_inr}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
