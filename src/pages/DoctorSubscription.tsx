import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Stethoscope, Check, ExternalLink, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const UPI_ID = "9789887989@ibl";
const UPI_NAME = "CARELENZ AI";

const DoctorSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<any>(null);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showTxnInput, setShowTxnInput] = useState(false);

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

  const handleUpiPay = () => {
    if (!plan) return;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${plan.price_inr}&cu=INR&tn=${encodeURIComponent("CARELENZ Doctor Registration")}`;
    window.open(upiUrl, "_blank");
    setShowTxnInput(true);
  };

  const handleSubmitTxn = async () => {
    if (!txnId.trim() || !plan || !user) return;
    setSubmitting(true);

    const now = new Date();

    const { error } = await supabase.from("user_subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "pending",
      upi_transaction_id: txnId.trim(),
      starts_at: now.toISOString(),
      expires_at: null,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment Submitted!", description: "Your subscription will be activated after admin approval." });
      setShowTxnInput(false);
      setTxnId("");
      fetchActiveSub();
    }
    setSubmitting(false);
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
                  <span>{plan.duration_days} Days Validity</span>
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

              <Button className="w-full rounded-xl" onClick={handleUpiPay}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Pay ₹{plan.price_inr} via UPI
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Transaction ID Input */}
        {showTxnInput && (
          <Card className="shadow-elevated border-primary/30">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-display font-semibold">Confirm Payment</h3>
              <p className="text-sm text-muted-foreground">
                After completing the UPI payment of <strong>₹{plan?.price_inr}</strong>, enter your UPI Transaction ID below.
              </p>
              <div className="space-y-1.5">
                <Label>UPI Transaction ID</Label>
                <Input
                  placeholder="e.g. UPI1234567890"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Find this in your UPI app payment history</p>
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={handleSubmitTxn}
                disabled={!txnId.trim() || submitting}
              >
                {submitting ? "Submitting..." : "Submit Payment"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* UPI Info */}
        <Card className="shadow-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pay to UPI ID</p>
            <p className="font-mono text-sm font-bold text-primary">{UPI_ID}</p>
            <p className="text-xs text-muted-foreground mt-2">Admin will verify and activate your subscription</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorSubscription;
