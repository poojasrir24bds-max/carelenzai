import { useNavigate } from "react-router-dom";
import { ScanLine, History, Calendar, User, LogOut, Stethoscope, Bell, MessageSquare, HeartPulse, Video, Crown, Lock, MapPin, Star } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
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
import MedicalHistoryForm from "@/components/MedicalHistoryForm";
import RatingStars, { AverageRating } from "@/components/RatingStars";

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
  const { hasActiveSubscription, loading: subLoading, scansRemaining, consultationsRemaining, plan } = useSubscription();
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [doubtText, setDoubtText] = useState("");
  const [submittingDoubt, setSubmittingDoubt] = useState(false);
  const [myDoubts, setMyDoubts] = useState<any[]>([]);
  const [activeConsultations, setActiveConsultations] = useState<any[]>([]);
  const [completedConsultations, setCompletedConsultations] = useState<any[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [patientRatings, setPatientRatings] = useState<Record<string, any>>({});
  const [doctorAvgRatings, setDoctorAvgRatings] = useState<Record<string, { avg: number; count: number }>>({});

  const handleScanClick = (area?: string) => {
    if (!hasActiveSubscription) {
      toast({ title: t("sub.subscriptionRequired") || "Subscription Required", description: t("sub.pleaseSubscribe") || "Please subscribe to a plan to access scanning.", variant: "destructive" });
      navigate("/subscription");
      return;
    }
    if (scansRemaining <= 0) {
      toast({ title: "Scan limit reached", description: "You have used all scans in your current plan.", variant: "destructive" });
      return;
    }
    navigate("/patient/scan", area ? { state: { area } } : undefined);
  };

  useEffect(() => {
    if (user) {
      fetchScans();
      fetchDoubts();
      fetchActiveConsultations();
      fetchCompletedConsultations();
      fetchAvailableDoctors();
      fetchPatientRatings();
    }
  }, [user]);

  const fetchPatientRatings = async () => {
    const { data } = await supabase
      .from("consultation_ratings" as any)
      .select("*")
      .eq("rated_by", user!.id);
    const map: Record<string, any> = {};
    (data as any[] || []).forEach((r: any) => { map[r.consultation_id] = r; });
    setPatientRatings(map);
  };

  const fetchCompletedConsultations = async () => {
    const { data } = await supabase
      .from("consultations")
      .select("*")
      .eq("patient_id", user!.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10);
    setCompletedConsultations(data || []);
  };

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

  const fetchActiveConsultations = async () => {
    const { data } = await supabase
      .from("consultations")
      .select("*")
      .eq("patient_id", user!.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false });
    setActiveConsultations(data || []);
  };

  const fetchAvailableDoctors = async () => {
    const { data: doctors } = await supabase
      .from("doctor_profiles")
      .select("*")
      .eq("is_verified", true)
      .eq("is_active", true);
    
    if (doctors && doctors.length > 0) {
      const userIds = doctors.map(d => d.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      
      // Fetch average ratings for each doctor
      const { data: allRatings } = await supabase
        .from("consultation_ratings" as any)
        .select("rated_user, rating")
        .in("rated_user", userIds);
      const ratingMap: Record<string, { total: number; count: number }> = {};
      (allRatings as any[] || []).forEach((r: any) => {
        if (!ratingMap[r.rated_user]) ratingMap[r.rated_user] = { total: 0, count: 0 };
        ratingMap[r.rated_user].total += r.rating;
        ratingMap[r.rated_user].count += 1;
      });
      const avgMap: Record<string, { avg: number; count: number }> = {};
      Object.entries(ratingMap).forEach(([uid, v]) => {
        avgMap[uid] = { avg: v.total / v.count, count: v.count };
      });
      setDoctorAvgRatings(avgMap);

      const enrichedDoctors = doctors.map(d => ({ ...d, profile_name: profileMap[d.user_id] || "Doctor" }));
      
      // Sort by proximity: match patient address keywords against doctor address
      const patientAddress = (profile?.address || "").toLowerCase();
      const patientWords = patientAddress.split(/[\s,]+/).filter((w: string) => w.length > 2);
      
      const scored = enrichedDoctors.map(doc => {
        const docAddr = (doc.address || "").toLowerCase();
        const matchCount = patientWords.filter((word: string) => docAddr.includes(word)).length;
        return { ...doc, locationScore: matchCount, isNearby: matchCount >= 1 && patientWords.length > 0 };
      });
      
      // Sort: nearby first, then by rating
      scored.sort((a, b) => {
        if (b.locationScore !== a.locationScore) return b.locationScore - a.locationScore;
        const aRating = avgMap[a.user_id]?.avg || 0;
        const bRating = avgMap[b.user_id]?.avg || 0;
        return bRating - aRating;
      });
      setAvailableDoctors(scored);
    } else {
      setAvailableDoctors([]);
    }
  };

  const handleRequestConsultation = async () => {
    if (!user) return;
    // Find a verified doctor to assign
    const { data: doctors } = await supabase
      .from("doctor_profiles")
      .select("user_id")
      .eq("is_verified", true)
      .eq("is_active", true)
      .limit(1);

    if (!doctors || doctors.length === 0) {
      toast({ title: t("patient.noDoctorAvailable"), variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("consultations").insert({
      patient_id: user.id,
      doctor_id: doctors[0].user_id,
      status: "pending",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("patient.consultationRequested") });
      fetchActiveConsultations();
    }
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
          <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
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

        {/* Subscription Status Card */}
        {hasActiveSubscription && !subLoading && (
          <Card className="shadow-elevated border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-yellow-500" />
                <p className="font-display font-bold text-sm">{plan?.name || "Active"} Plan</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-xl p-3 text-center border border-border">
                  <ScanLine className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold">{scansRemaining}</p>
                  <p className="text-xs text-muted-foreground">AI Scans Left</p>
                </div>
                <div className="bg-card rounded-xl p-3 text-center border border-border">
                  <Video className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold">{consultationsRemaining}</p>
                  <p className="text-xs text-muted-foreground">Video Consults Left</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="font-display font-semibold text-lg mb-3">{t("patient.selectScan")}</h2>
          <p className="text-muted-foreground text-sm mb-3">{t("patient.tapToScan")}</p>
          {!hasActiveSubscription && !subLoading && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-foreground"><strong>Subscribe to unlock scanning.</strong> Choose a plan to start AI health scans.</p>
            </div>
          )}
          <div className="grid grid-cols-4 gap-3">
            {scanAreaItems.map((area) => (
              <button
                key={area.id}
                onClick={() => handleScanClick(t(area.labelKey))}
                className={`bg-card rounded-2xl p-4 shadow-card border border-border hover:border-primary hover:shadow-elevated transition-all text-center active:scale-[0.97] ${!hasActiveSubscription ? "opacity-60" : ""}`}
              >
                <span className="text-2xl block mb-1">{area.emoji}</span>
                <span className="text-sm font-medium">{t(area.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <Card className={`border-border shadow-card ${!hasActiveSubscription ? "opacity-60 relative" : ""}`}>
          <CardContent className="p-5">
            {!hasActiveSubscription && (
              <div className="absolute inset-0 bg-background/50 rounded-lg flex flex-col items-center justify-center z-10 cursor-pointer" onClick={() => navigate("/subscription")}>
                <Lock className="h-6 w-6 text-warning mb-2" />
                <p className="text-sm font-semibold">Subscribe to unlock</p>
                <p className="text-xs text-muted-foreground">Choose a plan to ask health questions</p>
              </div>
            )}
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
              disabled={!hasActiveSubscription}
            />
            <Button onClick={handleSubmitDoubt} disabled={!doubtText.trim() || submittingDoubt || !hasActiveSubscription} className="w-full rounded-xl" size="sm">
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

        {/* Medical History Section */}
        {user && (
          <MedicalHistoryForm userId={user.id} />
        )}

        {/* Available Doctors */}
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">{t("patient.availableDoctors")}</h2>
          {availableDoctors.length === 0 ? (
            <Card className="shadow-card border-border">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">{t("patient.noDoctorsYet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {availableDoctors.map((doc: any) => (
                <Card key={doc.id} className={`shadow-card border-border ${doc.isNearby ? "border-success/30 bg-success/5" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-full p-2.5">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{doc.profile_name || "Doctor"}</p>
                        <p className="text-xs text-muted-foreground capitalize">🩺 {doc.specialization}</p>
                        <p className="text-xs text-muted-foreground">🏥 {doc.hospital_name}</p>
                        {doc.address && (
                          <p className="text-xs text-muted-foreground">📍 {doc.address}</p>
                        )}
                        <AverageRating
                          rating={doctorAvgRatings[doc.user_id]?.avg || 0}
                          count={doctorAvgRatings[doc.user_id]?.count || 0}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/20 text-success">✅ {t("patient.verified")}</span>
                        {doc.isNearby && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Near You
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 pb-4">
          <button
            onClick={() => navigate("/subscription")}
            className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all"
          >
            <Crown className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
            <span className="text-xs font-medium">{t("sub.subscribe")}</span>
          </button>
          <button
            onClick={() => navigate("/patient/scan")}
            className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all"
          >
            <Stethoscope className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">{t("patient.findDoctor")}</span>
          </button>
          <button
            onClick={handleRequestConsultation}
            className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all"
          >
            <Video className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">{t("patient.videoCall")}</span>
          </button>
          <button className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all">
            <User className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">{t("patient.profile")}</span>
          </button>
        </div>

        {/* Active Consultations */}
        {activeConsultations.length > 0 && (
          <div className="pb-4">
            <h2 className="font-display font-semibold text-lg mb-3">{t("patient.activeConsultations")}</h2>
            <div className="space-y-3">
              {activeConsultations.map((c: any) => (
                <Card key={c.id} className="shadow-card border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{t("patient.videoConsultation")}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.status === "pending" ? t("patient.waitingDoctor") : t("patient.doctorAccepted")}
                      </p>
                    </div>
                    {c.status === "accepted" && (
                      <Button
                        size="sm"
                        className="rounded-xl"
                        onClick={() => navigate("/video-call", { state: { roomId: c.room_id, consultationId: c.id, role: "patient" } })}
                      >
                        <Video className="h-4 w-4 mr-1" /> {t("patient.joinCall")}
                      </Button>
                    )}
                    {c.status === "pending" && (
                      <span className="text-xs text-warning font-medium animate-pulse">⏳ {t("patient.pending")}</span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Consultations - Rate Doctor */}
        {completedConsultations.length > 0 && (
          <div className="pb-4">
            <h2 className="font-display font-semibold text-lg mb-3">Rate Your Doctor</h2>
            <div className="space-y-3">
              {completedConsultations.map((c: any) => (
                <Card key={c.id} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm">Consultation</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(c.created_at).toLocaleDateString()} • ✅ Completed
                    </p>
                    <RatingStars
                      consultationId={c.id}
                      ratedBy={user!.id}
                      ratedUser={c.doctor_id}
                      existingRating={patientRatings[c.id]?.rating}
                      existingReview={patientRatings[c.id]?.review}
                      onRated={fetchPatientRatings}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
