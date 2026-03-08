import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Zap, ScanLine, Stethoscope, Check, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showTxnInput, setShowTxnInput] = useState(false);

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
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    setActiveSub((data as any[])?.[0] || null);
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setShowQr(true);
    setShowTxnInput(false);
    setTxnId("");
  };

  const handleSubmitFromQr = async () => {
    if (!txnId.trim() || !selectedPlan || !user) return;
    setSubmitting(true);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + selectedPlan.duration_days * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("user_subscriptions" as any).insert({
      user_id: user.id,
      plan_id: selectedPlan.id,
      status: "pending",
      upi_transaction_id: txnId.trim(),
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    } as any);

    setSubmitting(false);
    setShowQr(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment Submitted!", description: "Your subscription will be activated after admin verifies your payment." });
      navigate("/patient");
    }
  };

  const handleSubmitTxn = async () => {
    if (!txnId.trim() || !selectedPlan || !user) return;
    setSubmitting(true);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + selectedPlan.duration_days * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("user_subscriptions" as any).insert({
      user_id: user.id,
      plan_id: selectedPlan.id,
      status: "pending",
      upi_transaction_id: txnId.trim(),
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment Submitted!", description: "Your subscription will be activated after admin verifies your payment." });
      setSelectedPlan(null);
      setTxnId("");
      setShowTxnInput(false);
      navigate("/patient");
    }
    setSubmitting(false);
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
          <Card className="shadow-elevated border-success/30 bg-success/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-success/20 rounded-full p-2">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{t("sub.activePlan")}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeSub.subscription_plans?.name} • {t("sub.expires")} {new Date(activeSub.expires_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
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
                      onClick={() => handleSelectPlan(plan)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {t("sub.payWithUpi")} • ₹{plan.price_inr}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Transaction ID Submission */}
        {showTxnInput && selectedPlan && (
          <Card className="shadow-elevated border-primary/30">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-display font-semibold">{t("sub.confirmPayment")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("sub.confirmPaymentDesc")} <strong>{selectedPlan.name}</strong> (₹{selectedPlan.price_inr})
              </p>
              <div className="space-y-1.5">
                <Label>{t("sub.transactionId")}</Label>
                <Input
                  placeholder="e.g. UPI1234567890"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("sub.transactionIdHint")}</p>
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={handleSubmitTxn}
                disabled={!txnId.trim() || submitting}
              >
                {submitting ? t("common.loading") : t("sub.submitPayment")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-display">
              Scan & Pay ₹{selectedPlan?.price_inr}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              Scan the QR code below using any UPI app to pay for <strong>{selectedPlan?.name} Plan</strong>
            </p>
            <div className="rounded-xl border-2 border-border overflow-hidden bg-white p-2">
              <img src={phonepeQr} alt="PhonePe QR Code" className="w-64 h-64 object-contain" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Pay exactly <strong>₹{selectedPlan?.price_inr}</strong> to complete your subscription
            </p>
            <div className="w-full space-y-2">
              <Label>{t("sub.transactionId")}</Label>
              <Input
                placeholder="e.g. UPI1234567890"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("sub.transactionIdHint")}</p>
            </div>
            <Button className="w-full rounded-xl" onClick={handleSubmitFromQr} disabled={!txnId.trim() || submitting}>
              {submitting ? t("common.loading") : t("sub.submitPayment")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscription;
