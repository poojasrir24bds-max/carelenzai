import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertTriangle, CheckCircle, ShieldAlert, Stethoscope, Droplets, Salad, Heart, Sparkles, Volume2, Pause, Square, MessageSquare, Lock } from "lucide-react";
import logo from "@/assets/logo.png";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import LanguageToggle from "@/components/LanguageToggle";

const guidanceIcons = [Droplets, Salad, Heart, Sparkles];

const ScanResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const result = location.state?.result;
  const scanId = location.state?.scanId;
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doubtText, setDoubtText] = useState("");
  const [submittingDoubt, setSubmittingDoubt] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedData, setTranslatedData] = useState<{
    condition: string; definition: string; severityDesc: string; causes: string[]; guidance: string[];
  } | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      if (v.length > 0) setVoices(v);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    if (result) {
      fetchDoctors();
    }
  }, [result]);

  // Auto-translate when language changes to Tamil
  useEffect(() => {
    if (lang === "ta" && result && !translatedData && !translating) {
      translateToTamil();
    }
  }, [lang]);

  const translateToTamil = async () => {
    if (!result) return;
    setTranslating(true);
    try {
      const sevDesc = result.severity === "high" ? t("results.highDesc") : result.severity === "medium" ? t("results.mediumDesc") : t("results.lowDesc");
      const { data, error } = await supabase.functions.invoke("translate", {
        body: {
          targetLang: "Tamil (தமிழ்)",
          structuredResult: {
            condition: result.condition,
            definition: result.definition,
            severityDesc: sevDesc,
            causes: result.causes || [],
            guidance: result.guidance || [],
          },
        },
      });
      if (!error && data?.translatedResult) {
        setTranslatedData(data.translatedResult);
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from("doctor_profiles")
      .select("*, profiles!doctor_profiles_user_id_fkey(full_name)")
      .eq("is_verified", true)
      .eq("is_active", true);
    setDoctors(data || []);
  };

  const handleBookDoctor = async (doctorUserId: string) => {
    if (!user || !scanId) return;
    const { error } = await supabase.from("consultations").insert({
      patient_id: user.id,
      doctor_id: doctorUserId,
      scan_id: scanId,
    });
    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Consultation requested!" });
    }
  };

  const handleSubmitDoubt = async () => {
    if (!doubtText.trim() || !user) return;
    setSubmittingDoubt(true);
    const question = doubtText.trim();

    const { data: insertedDoubt, error } = await supabase.from("patient_doubts").insert({
      patient_id: user.id,
      scan_id: scanId || null,
      question,
    }).select().single();

    if (error) {
      setSubmittingDoubt(false);
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
      return;
    }

    setSubmittedQuestion(question);
    setAiAnswer(null);
    setDoubtText("");

    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke("answer-doubt", {
        body: { question, doubtId: insertedDoubt.id },
      });

      if (!aiError && aiData?.answer) {
        setAiAnswer(aiData.answer);
      } else {
        toast({ title: "Could not get AI response", variant: "destructive" });
      }
    } catch (e) {
      console.error("AI answer error:", e);
    }
    setSubmittingDoubt(false);
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const splitTextForTTS = (text: string, maxLen = 180): string[] => {
    const sentences = text.split(/(?<=[.!?।,])\s+/);
    const chunks: string[] = [];
    let current = "";
    for (const s of sentences) {
      if ((current + " " + s).trim().length > maxLen && current) {
        chunks.push(current.trim());
        current = s;
      } else {
        current = current ? current + " " + s : s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : [text.substring(0, maxLen)];
  };

  const playTamilTTS = async (text: string) => {
    handleStopAudio();
    setIsSpeaking(true);
    const chunks = splitTextForTTS(text);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      for (const chunk of chunks) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-tamil`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ text: chunk }),
          }
        );
        if (!response.ok) throw new Error("TTS request failed");
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(audioUrl); reject(new Error("Audio playback failed")); };
          audio.play().catch(reject);
        });
      }
    } catch (e) {
      console.error("Tamil TTS error:", e);
    }
    setIsSpeaking(false);
    audioRef.current = null;
  };

  const handlePlayAudio = () => {
    if (!result) return;

    const dc = lang === "ta" && translatedData ? translatedData.condition : result.condition;
    const dd = lang === "ta" && translatedData ? translatedData.definition : result.definition;
    const dg = lang === "ta" && translatedData ? translatedData.guidance : (result.guidance || []);
    const text = `${dc}. ${dd}. ${dg.join(". ")}`;

    if (lang === "ta") {
      if (isSpeaking) {
        handleStopAudio();
        return;
      }
      playTamilTTS(text);
      return;
    }

    // English: use browser SpeechSynthesis
    if (!window.speechSynthesis) return;

    if (isSpeaking && window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.pause();
        setIsSpeaking(false);
      }
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    const availableVoices = voices.length > 0 ? voices : (window.speechSynthesis.getVoices() || []);
    const englishVoice = availableVoices.find(v => v.lang === "en-US") || availableVoices.find(v => v.lang.startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onpause = () => setIsSpeaking(false);
    utterance.onresume = () => setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">{t("results.noResults")}</p>
        <Button onClick={() => navigate("/patient/scan")}>{t("results.goToScan")}</Button>
      </div>
    );
  }

  const sevConfig = {
    low: { color: "bg-success", label: t("results.lowRisk"), desc: t("results.lowDesc") },
    medium: { color: "bg-warning", label: t("results.mediumRisk"), desc: t("results.mediumDesc") },
    high: { color: "bg-destructive", label: t("results.highRisk"), desc: t("results.highDesc") },
  };
  const sev = sevConfig[result.severity as keyof typeof sevConfig] || sevConfig.low;

  const displayCondition = lang === "ta" && translatedData ? translatedData.condition : result.condition;
  const displayDefinition = lang === "ta" && translatedData ? translatedData.definition : result.definition;
  const displayCauses = lang === "ta" && translatedData ? translatedData.causes : (result.causes || []);
  const displayGuidance = lang === "ta" && translatedData ? translatedData.guidance : (result.guidance || []);
  const displaySevDesc = lang === "ta" && translatedData ? translatedData.severityDesc : sev.desc;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/patient")} className="text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
            <span className="font-display font-bold text-primary-foreground">{t("results.title")}</span>
          </div>
        </div>
        <LanguageToggle variant="header" />
      </header>

      <div className="flex-1 container py-6 space-y-5">
        {/* Subscription Wall */}
        {!subLoading && !hasActiveSubscription && (
          <Card className="border-warning shadow-elevated">
            <CardContent className="p-6 text-center space-y-3">
              <Lock className="h-10 w-10 text-warning mx-auto" />
              <h3 className="font-display font-bold text-lg">Subscribe to View Results</h3>
              <p className="text-sm text-muted-foreground">
                Your scan is complete! Subscribe to a plan to unlock your detailed analysis, causes, and guidance.
              </p>
              <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={() => navigate("/subscription")}>
                View Subscription Plans
              </Button>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/patient")}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {(hasActiveSubscription || subLoading) && (
        <>
        {translating && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            {t("common.loading")}
          </div>
        )}

        {/* Severity Badge */}
        <Card className="border-border shadow-elevated">
          <CardContent className="p-5 text-center">
            <div className={`inline-flex items-center gap-2 ${sev.color} text-primary-foreground rounded-full px-5 py-2 font-bold text-sm mb-3`}>
              {result.severity === "low" && <CheckCircle className="h-4 w-4" />}
              {result.severity === "medium" && <AlertTriangle className="h-4 w-4" />}
              {result.severity === "high" && <ShieldAlert className="h-4 w-4" />}
              {sev.label}
            </div>
            <h2 className="font-display text-xl font-bold">{displayCondition}</h2>
            <p className="text-muted-foreground text-sm mt-1">{result.confidence}% {t("results.confidence")}</p>
            <p className="text-sm mt-2">{displaySevDesc}</p>
          </CardContent>
        </Card>

        {/* Voiceover */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={handlePlayAudio}>
            {isSpeaking ? <Pause className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
            {isSpeaking ? t("results.pause") : t("results.listen")}
          </Button>
          {(isSpeaking || window.speechSynthesis?.speaking) && (
            <Button variant="destructive" size="sm" className="rounded-xl" onClick={handleStopAudio}>
              <Square className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Definition */}
        {displayDefinition && (
          <Card className="border-border shadow-card">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-2">
                {t("results.whatIs")} {displayCondition}?
              </h3>
              <p className="text-sm text-muted-foreground">{displayDefinition}</p>
            </CardContent>
          </Card>
        )}

        {/* Causes */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-3">{t("results.causes")}</h3>
            <div className="space-y-2">
              {displayCauses.map((cause: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <p className="text-sm text-muted-foreground">{cause}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Guidance */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-3">{t("results.guidance")}</h3>
            <div className="space-y-3">
              {displayGuidance.map((text: string, i: number) => {
                const Icon = guidanceIcons[i % guidanceIcons.length];
                return (
                  <div key={i} className="flex items-center gap-3 bg-accent/50 rounded-xl p-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm">{text}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Ask Question */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {t("results.askQuestion")}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{t("results.askQuestionDesc")}</p>
            <Textarea
              placeholder={t("results.questionPlaceholder")}
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
              className="mb-3"
              rows={3}
            />
            <Button
              onClick={handleSubmitDoubt}
              disabled={!doubtText.trim() || submittingDoubt}
              className="w-full rounded-xl"
              size="sm"
            >
              {submittingDoubt ? t("results.submitting") : t("results.submitQuestion")}
            </Button>

            {(submittingDoubt || aiAnswer || submittedQuestion) && (
              <div className="mt-4 space-y-2">
                {submittedQuestion && (
                  <div className="bg-accent/30 rounded-lg p-2.5">
                    <p className="text-xs font-medium">❓ {submittedQuestion}</p>
                  </div>
                )}
                {submittingDoubt ? (
                  <div className="bg-primary/5 rounded-lg p-3 flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    <p className="text-xs text-muted-foreground">{t("results.gettingAI")}</p>
                  </div>
                ) : aiAnswer ? (
                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">🤖 {t("results.aiResponse")}</p>
                    <p className="text-sm">{aiAnswer}</p>
                    <p className="text-xs text-muted-foreground mt-2">💡 {t("results.doctorMayReview")}</p>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Doctors */}
        {(result.severity === "medium" || result.severity === "high") && (
          <Card className="border-border shadow-card">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-3">{t("results.recommendedDoctors")}</h3>
              {doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("results.noDoctors")}</p>
              ) : (
                <div className="space-y-3">
                  {doctors.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2.5">
                          <Stethoscope className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{doc.profiles?.full_name || "Doctor"}</p>
                          <p className="text-xs text-muted-foreground">{doc.specialization} • {doc.hospital_name}</p>
                        </div>
                      </div>
                      <Button size="sm" className="rounded-lg text-xs" onClick={() => handleBookDoctor(doc.user_id)}>
                        {t("results.book")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center pb-4">{t("results.disclaimer")}</p>
        </>
        )}
      </div>
    </div>
  );
};

export default ScanResults;
