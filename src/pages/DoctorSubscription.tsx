import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Stethoscope, Check, CreditCard, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const DoctorSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<any>(null);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchPlan();
    if (user) fetchActiveSub();
  }, [user]);

  const fetchPlan = async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("name", "Doctor Plan")
      .eq("is_active", true)
      .maybeSingle();
    setPlan(data);
  };

  const fetchActiveSub = async () => {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", user!.id)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1);
    setActiveSub((data as any[])?.[0] || null);
  };

  const handlePayWithRazorpay = async () => {
    if (!user || !plan || paying) return;
    setPaying(true);

    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke('razorpay-create-order', {
        body: { plan_id: plan.id },
      });

      if (orderError || !orderData?.order_id) {
        throw new Error(orderError?.message || 'Failed to create order');
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CARELENZ AI',
        description: 'Doctor Registration',
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

            toast({ title: "Payment Successful! ✅", description: "Your doctor registration is now active." });
            navigate("/doctor");
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
        <button onClick={() => navigate("/doctor")} className="text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">Doctor Subscription</span>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-6 max-w-md mx-auto">
        {/* Active / Pending Subscription */}
        {activeSub && (
          <Card className={`shadow-elevated ${activeSub.status === "active" ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`rounded-full p-2 ${activeSub.status === "active" ? "bg-success/20" : "bg-warning/20"}`}>
                  {activeSub.status === "active" ? <Check className="h-5 w-5 text-success" /> : <Crown className="h-5 w-5 text-warning" />}
                </div>
                <div>
                  <p className="font-display font-bold text-sm">
                    {activeSub.status === "active" ? "Active Subscription" : "⏳ Pending Approval"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeSub.status === "active"
                      ? `${(activeSub.subscription_plans?.doctor_consultations || 5) - (activeSub.consultations_used || 0)} consultations remaining`
                      : "Your payment is being verified by admin"}
                  </p>
                </div>
              </div>
              {activeSub.status === "active" && (
                <div className="bg-background rounded-xl p-3 text-center">
                  <Stethoscope className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">
                    {activeSub.consultations_used}/{activeSub.subscription_plans?.doctor_consultations || 5}
                  </p>
                  <p className="text-xs text-muted-foreground">Consultations Used</p>
                </div>
              )}
              {activeSub.status === "active" && (
                <Button className="w-full mt-4 rounded-xl" onClick={() => navigate("/doctor")}>
                  Go to Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plan Card */}
        {plan && !activeSub?.status?.includes("active") && (
          <Card className="shadow-card border-2 border-primary/40 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
              Required
            </div>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full p-2.5 bg-primary/10">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-lg">Doctor Registration</p>
                  <p className="text-2xl font-bold">
                    ₹{plan.price_inr}<span className="text-sm font-normal text-muted-foreground">/registration</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>{plan.doctor_consultations} Patient Consultations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>No expiry — valid until all consultations used</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>Video Call Support</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>Patient Scan History Access</span>
                </div>
              </div>

              <Button className="w-full rounded-xl" onClick={handlePayWithRazorpay} disabled={paying}>
                <CreditCard className="h-4 w-4 mr-2" />
                {paying ? "Processing..." : `Pay ₹${plan.price_inr}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DoctorSubscription;
