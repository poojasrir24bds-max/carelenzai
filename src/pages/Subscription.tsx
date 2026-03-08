import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Zap, ScanLine, Stethoscope, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import phonepeQr from "@/assets/phonepe-qr.jpeg";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

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
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmitPayment = async () => {
    if (!user || !selectedPlan || submitting) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: selectedPlan.id,
        status: "pending",
        starts_at: new Date().toISOString(),
      } as any);

      if (error) throw error;

      toast({ title: "Submitted! ✅", description: "Your request is under review. Admin will approve it shortly." });
      setSelectedPlan(null);
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
        <button onClick={() => navigate("/patient")} className="text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">{t("sub.title")}</span>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-6">
        {/* Active / Pending Subscription */}
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
                    {activeSub.status === 'pending' ? '⏳ Payment Under Review' : t("sub.activePlan")}
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
              const isSelected = selectedPlan?.id === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={`shadow-card border-2 ${isSelected ? "border-primary ring-2 ring-primary/20" : colorClass} relative overflow-hidden cursor-pointer transition-all`}
                  onClick={() => setSelectedPlan(plan)}
                >
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

                    <div className="space-y-2 mb-2">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* PhonePe QR Payment Section */}
        {selectedPlan && !activeSub && (
          <Card className="shadow-elevated border-2 border-primary/30">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-display font-bold text-lg text-center">
                Pay ₹{selectedPlan.price_inr} via PhonePe
              </h3>
              <div className="flex justify-center">
                <img
                  src={phonepeQr}
                  alt="PhonePe QR Code"
                  className="w-56 h-56 rounded-xl border-2 border-muted object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Scan the QR code using PhonePe, Google Pay, or any UPI app. After payment, enter your UPI Transaction ID below.
              </p>
              <div className="space-y-3">
                <Input
                  placeholder="Enter UPI Transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="rounded-xl"
                />
                <Button
                  className="w-full rounded-xl"
                  onClick={handleSubmitPayment}
                  disabled={!transactionId.trim() || submitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Subscription;
