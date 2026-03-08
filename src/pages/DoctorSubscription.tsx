import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Stethoscope, Check, Send, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo.png";
import phonepeQr from "@/assets/phonepe-qr.jpeg";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DoctorSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<any>(null);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check if consultations are exhausted
  const docConsultations = activeSub?.subscription_plans?.doctor_consultations || 0;
  const consultationsUsed = activeSub?.consultations_used || 0;
  const creditsExhausted = !!(activeSub?.status === 'active' && consultationsUsed >= docConsultations);
  const canResubscribe = !activeSub || creditsExhausted;

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

  const handleSubmitPayment = async () => {
    if (!user || !plan || submitting) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: plan.id,
        status: "pending",
        starts_at: new Date().toISOString(),
      } as any);

      if (error) throw error;

      toast({ title: "Submitted! ✅", description: "Your request is under review. Admin will approve it shortly." });
      fetchActiveSub();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
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
          <Card className={`shadow-elevated ${
            creditsExhausted ? "border-destructive/30 bg-destructive/5" :
            activeSub.status === "active" ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
          }`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`rounded-full p-2 ${
                  creditsExhausted ? "bg-destructive/20" :
                  activeSub.status === "active" ? "bg-success/20" : "bg-warning/20"
                }`}>
                  {creditsExhausted ? (
                    <Crown className="h-5 w-5 text-destructive" />
                  ) : activeSub.status === "active" ? (
                    <Check className="h-5 w-5 text-success" />
                  ) : (
                    <Crown className="h-5 w-5 text-warning" />
                  )}
                </div>
                <div>
                  <p className="font-display font-bold text-sm">
                    {creditsExhausted
                      ? "❌ Consultations Exhausted"
                      : activeSub.status === "active" ? "Active Subscription" : "⏳ Pending Approval"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {creditsExhausted
                      ? "Please subscribe again to continue consultations"
                      : activeSub.status === "active"
                        ? `${docConsultations - consultationsUsed} consultations remaining`
                        : "Your payment is being verified by admin"}
                  </p>
                </div>
              </div>
              {activeSub.status === "active" && !creditsExhausted && (
                <>
                  <div className="bg-background rounded-xl p-3 text-center">
                    <Stethoscope className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-lg font-bold">
                      {consultationsUsed}/{docConsultations}
                    </p>
                    <p className="text-xs text-muted-foreground">Consultations Used</p>
                  </div>
                  <Button className="w-full mt-4 rounded-xl" onClick={() => navigate("/doctor")}>
                    Go to Dashboard
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plan Card */}
        {plan && canResubscribe && (
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

              {/* PhonePe QR */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-center">Pay via PhonePe</h3>
                <div className="flex justify-center">
                  <img
                    src={phonepeQr}
                    alt="PhonePe QR Code"
                    className="w-56 h-56 rounded-xl border-2 border-muted object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Scan the QR code using PhonePe, Google Pay, or any UPI app and complete the payment.
                </p>
                <Button
                  className="w-full rounded-xl"
                  onClick={handleSubmitPayment}
                  disabled={submitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Submitting..." : `I have paid ₹${plan.price_inr}, Submit for Approval`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DoctorSubscription;
