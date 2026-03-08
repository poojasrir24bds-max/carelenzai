import { useNavigate } from "react-router-dom";
import { ScanLine, History, Calendar, User, LogOut, Stethoscope, Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";

const scanAreaItems = [
  { id: "dental", labelKey: "area.dental", emoji: "🦷" },
  { id: "skin", labelKey: "area.skin", emoji: "🖐️" },
  { id: "hair", labelKey: "area.hair", emoji: "💇" },
  { id: "eyes", labelKey: "area.eyes", emoji: "👁️" },
  { id: "nails", labelKey: "area.nails", emoji: "💅" },
  { id: "lips", labelKey: "area.lips", emoji: "👄" },
  { id: "scalp", labelKey: "area.scalp", emoji: "🧠" },
];

const severityColors = {
  low: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  high: "bg-destructive text-destructive-foreground",
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [doubtText, setDoubtText] = useState("");
  const [submittingDoubt, setSubmittingDoubt] = useState(false);
  const [myDoubts, setMyDoubts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchScans();
      fetchDoubts();
    }
  }, [user]);

  const fetchScans = async () => {
    const { data } = await supabase
      .from("scans")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentScans(data || []);
  };

  const fetchDoubts = async () => {
    const { data } = await supabase
      .from("patient_doubts")
      .select("*")
      .eq("patient_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setMyDoubts(data || []);
  };

  const handleSubmitDoubt = async () => {
    if (!doubtText.trim() || !user) return;
    setSubmittingDoubt(true);
    const question = doubtText.trim();

    const { data: insertedDoubt, error } = await supabase.from("patient_doubts").insert({
      patient_id: user.id,
      question,
    }).select().single();

    if (error) {
      setSubmittingDoubt(false);
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: t("patient.submitting") });
    setDoubtText("");
    fetchDoubts();

    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke("answer-doubt", {
        body: { question, doubtId: insertedDoubt.id },
      });

      if (!aiError && aiData?.answer) {
        fetchDoubts();
      }
    } catch (e) {
      console.error("AI answer error:", e);
    }
    setSubmittingDoubt(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const severityLabels = {
    low: t("patient.lowRisk"),
    medium: t("patient.mediumRisk"),
    high: t("patient.highRisk"),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle variant="header" />
          <button className="text-primary-foreground relative">
            <Bell className="h-5 w-5" />
          </button>
          <button onClick={handleLogout} className="text-primary-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("patient.hello")} {profile?.full_name || t("role.patient")} 👋</h1>
          <p className="text-muted-foreground text-sm">{t("patient.howFeeling")}</p>
        </div>

        <div>
          <h2 className="font-display font-semibold text-lg mb-3">{t("patient.selectScan")}</h2>
          <p className="text-muted-foreground text-sm mb-3">{t("patient.tapToScan")}</p>
          <div className="grid grid-cols-4 gap-3">
            {scanAreaItems.map((area) => (
              <button
                key={area.id}
                onClick={() => navigate("/patient/scan", { state: { area: t(area.labelKey) } })}
                className="bg-card rounded-2xl p-4 shadow-card border border-border hover:border-primary hover:shadow-elevated transition-all text-center active:scale-[0.97]"
              >
                <span className="text-2xl block mb-1">{area.emoji}</span>
                <span className="text-sm font-medium">{t(area.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> {t("patient.askQuestion")}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{t("patient.askQuestionDesc")}</p>
            <Textarea
              placeholder={t("patient.questionPlaceholder")}
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <Button onClick={handleSubmitDoubt} disabled={!doubtText.trim() || submittingDoubt} className="w-full rounded-xl" size="sm">
              {submittingDoubt ? t("patient.submitting") : t("patient.submitQuestion")}
            </Button>

            {myDoubts.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("patient.recentQuestions")}</p>
                {myDoubts.map((d) => (
                  <div key={d.id} className="bg-accent/30 rounded-lg p-2.5 space-y-1">
                    <p className="text-xs font-medium">{d.question}</p>
                    {d.ai_answer && (
                      <div className="bg-primary/5 rounded p-2 mt-1">
                        <p className="text-xs text-muted-foreground font-medium">{t("patient.aiResponse")}</p>
                        <p className="text-xs mt-0.5">{d.ai_answer}</p>
                      </div>
                    )}
                    {d.answer ? (
                      <div className="bg-success/10 rounded p-2 mt-1">
                        <p className="text-xs text-success font-medium">{t("patient.doctorResponse")}</p>
                        <p className="text-xs text-success mt-0.5">{d.answer}</p>
                      </div>
                    ) : !d.ai_answer ? (
                      <p className="text-xs text-muted-foreground mt-1">{t("patient.gettingAI")}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">{t("patient.doctorMayReview")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">{t("patient.recentScans")}</h2>
            <button className="text-primary text-sm font-medium flex items-center gap-1">
              <History className="h-4 w-4" /> {t("patient.viewAll")}
            </button>
          </div>
          {recentScans.length === 0 ? (
            <Card className="shadow-card border-border">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">{t("patient.noScans")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan) => (
                <Card
                  key={scan.id}
                  className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all"
                  onClick={() => navigate("/patient/results", {
                    state: {
                      result: {
                        condition: scan.condition,
                        definition: scan.definition,
                        causes: scan.causes,
                        severity: scan.severity,
                        confidence: scan.confidence,
                        guidance: scan.guidance,
                      },
                      scanId: scan.id,
                    },
                  })}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm capitalize">{scan.area} {t("patient.scan")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{scan.condition}</p>
                    </div>
                    {scan.severity && (
                      <span className={`${severityColors[scan.severity as keyof typeof severityColors]} text-xs font-semibold px-3 py-1 rounded-full`}>
                        {severityLabels[scan.severity as keyof typeof severityLabels]}
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pb-4">
          <button className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all">
            <Stethoscope className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">{t("patient.findDoctor")}</span>
          </button>
          <button className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all">
            <Calendar className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">{t("patient.appointments")}</span>
          </button>
          <button className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all">
            <User className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">{t("patient.profile")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
