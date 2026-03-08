import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertTriangle, CheckCircle, ShieldAlert, Stethoscope, Droplets, Salad, Heart, Sparkles, Volume2, Pause, Square, MessageSquare, Globe } from "lucide-react";
import logo from "@/assets/logo.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const severityConfig = {
  low: { color: "bg-success", textColor: "text-success", label: "🟢 Low Risk", labelTa: "🟢 குறைந்த ஆபத்து", desc: "Normal or mild issue — no immediate concern" },
  medium: { color: "bg-warning", textColor: "text-warning", label: "🟡 Medium Risk", labelTa: "🟡 நடுத்தர ஆபத்து", desc: "Monitor condition and consider a doctor consultation" },
  high: { color: "bg-destructive", textColor: "text-destructive", label: "🔴 High Risk", labelTa: "🔴 அதிக ஆபத்து", desc: "Doctor consultation recommended immediately" },
};

const guidanceIcons = [Droplets, Salad, Heart, Sparkles];

type TranslatedResult = {
  condition: string;
  definition: string;
  severityDesc: string;
  causes: string[];
  guidance: string[];
};

const ScanResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const result = location.state?.result;
  const scanId = location.state?.scanId;
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doubtText, setDoubtText] = useState("");
  const [submittingDoubt, setSubmittingDoubt] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [lang, setLang] = useState<"en" | "ta">("en");
  const [translatedData, setTranslatedData] = useState<TranslatedResult | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Preload voices - they load asynchronously
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
    if (result && (result.severity === "medium" || result.severity === "high")) {
      fetchDoctors();
    }
  }, [result]);

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
      toast({ title: "Consultation requested!", description: "The doctor will review your request." });
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

    // Get AI answer in background (edge function saves it directly)
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

  const handleSwitchLang = async (newLang: "en" | "ta") => {
    if (newLang === lang) return;
    
    if (newLang === "en") {
      setLang("en");
      return;
    }

    // Translate to Tamil
    if (translatedData) {
      setLang("ta");
      return;
    }

    setTranslating(true);
    try {
      const sev = severityConfig[result.severity as keyof typeof severityConfig] || severityConfig.low;
      const { data, error } = await supabase.functions.invoke("translate", {
        body: {
          targetLang: "Tamil (தமிழ்)",
          structuredResult: {
            condition: result.condition,
            definition: result.definition,
            severityDesc: sev.desc,
            causes: result.causes || [],
            guidance: result.guidance || [],
          },
        },
      });
      if (!error && data?.translatedResult) {
        setTranslatedData(data.translatedResult);
        setLang("ta");
      } else {
        toast({ title: "Translation failed", variant: "destructive" });
      }
    } catch (err) {
      console.error("Translation error:", err);
      toast({ title: "Translation failed", variant: "destructive" });
    } finally {
      setTranslating(false);
    }
  };

  const handlePlayAudio = () => {
    if (!result || !window.speechSynthesis) return;

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

    const displayCondition = lang === "ta" && translatedData ? translatedData.condition : result.condition;
    const displayDefinition = lang === "ta" && translatedData ? translatedData.definition : result.definition;
    const displayGuidance = lang === "ta" && translatedData ? translatedData.guidance : (result.guidance || []);

    const text = `${displayCondition}. ${displayDefinition}. ${displayGuidance.join(". ")}`;

    const utterance = new SpeechSynthesisUtterance(text);
    const isTamil = lang === "ta";
    utterance.lang = isTamil ? "ta-IN" : "en-US";
    
    // Find a matching voice for the language
    const availableVoices = voices.length > 0 ? voices : (window.speechSynthesis.getVoices() || []);
    if (isTamil) {
      const tamilVoice = availableVoices.find(v => v.lang === "ta-IN")
        || availableVoices.find(v => v.lang.startsWith("ta"))
        || availableVoices.find(v => v.lang.toLowerCase().includes("tamil"));
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      } else {
        console.warn("No Tamil voice available on this device. Available voices:", availableVoices.map(v => `${v.name} (${v.lang})`));
      }
    } else {
      const englishVoice = availableVoices.find(v => v.lang === "en-US") || availableVoices.find(v => v.lang.startsWith("en"));
      if (englishVoice) utterance.voice = englishVoice;
    }
    
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onpause = () => setIsSpeaking(false);
    utterance.onresume = () => setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">No scan results available.</p>
        <Button onClick={() => navigate("/patient/scan")}>Go to Scan</Button>
      </div>
    );
  }

  const sev = severityConfig[result.severity as keyof typeof severityConfig] || severityConfig.low;

  // Display values based on current language
  const displayCondition = lang === "ta" && translatedData ? translatedData.condition : result.condition;
  const displayDefinition = lang === "ta" && translatedData ? translatedData.definition : result.definition;
  const displayCauses = lang === "ta" && translatedData ? translatedData.causes : (result.causes || []);
  const displayGuidance = lang === "ta" && translatedData ? translatedData.guidance : (result.guidance || []);
  const displaySevDesc = lang === "ta" && translatedData ? translatedData.severityDesc : sev.desc;
  const displaySevLabel = lang === "ta" ? sev.labelTa : sev.label;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/patient")} className="text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
            <span className="font-display font-bold text-primary-foreground">
              {lang === "ta" ? "ஸ்கேன் முடிவுகள்" : "Scan Results"}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-5">
        {/* Language Toggle */}
        <div className="flex items-center justify-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div className="flex bg-muted rounded-full p-0.5">
            <button
              onClick={() => handleSwitchLang("en")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleSwitchLang("ta")}
              disabled={translating}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                lang === "ta" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {translating ? (
                <span className="flex items-center gap-1">
                  <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  மொழிபெயர்...
                </span>
              ) : "தமிழ்"}
            </button>
          </div>
        </div>

        {/* Severity Badge */}
        <Card className="border-border shadow-elevated">
          <CardContent className="p-5 text-center">
            <div className={`inline-flex items-center gap-2 ${sev.color} text-primary-foreground rounded-full px-5 py-2 font-bold text-sm mb-3`}>
              {result.severity === "low" && <CheckCircle className="h-4 w-4" />}
              {result.severity === "medium" && <AlertTriangle className="h-4 w-4" />}
              {result.severity === "high" && <ShieldAlert className="h-4 w-4" />}
              {displaySevLabel}
            </div>
            <h2 className="font-display text-xl font-bold">{displayCondition}</h2>
            <p className="text-muted-foreground text-sm mt-1">{result.confidence}% {lang === "ta" ? "நம்பகத்தன்மை" : "confidence"}</p>
            <p className="text-sm mt-2">{displaySevDesc}</p>
          </CardContent>
        </Card>

        {/* Voiceover Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl"
            onClick={handlePlayAudio}
          >
            {isSpeaking ? <Pause className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
            {isSpeaking
              ? (lang === "ta" ? "இடைநிறுத்து" : "Pause")
              : (lang === "ta" ? "🔊 கேளுங்கள்" : "🔊 Listen")}
          </Button>
          {(isSpeaking || window.speechSynthesis?.speaking) && (
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl"
              onClick={handleStopAudio}
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Definition */}
        {displayDefinition && (
          <Card className="border-border shadow-card">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-2">
                {lang === "ta" ? `${displayCondition} என்றால் என்ன?` : `What is ${displayCondition}?`}
              </h3>
              <p className="text-sm text-muted-foreground">{displayDefinition}</p>
            </CardContent>
          </Card>
        )}

        {/* Possible Causes */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-3">
              {lang === "ta" ? "சாத்தியமான காரணங்கள்" : "Possible Causes"}
            </h3>
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

        {/* Health Guidance */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-3">
              {lang === "ta" ? "சுகாதார வழிகாட்டுதல்" : "Health Guidance"}
            </h3>
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

        {/* Patient Doubt Box */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {lang === "ta" ? "கேள்வி கேளுங்கள்" : "Ask a Question"}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {lang === "ta"
                ? "உங்கள் கண்டறிதல் பற்றி சந்தேகங்கள் உள்ளதா? இங்கே கேளுங்கள், மருத்துவர் பதிலளிப்பார்."
                : "Have doubts about your diagnosis? Ask here and a doctor will review your question."}
            </p>
            <Textarea
              placeholder={lang === "ta" ? "கண்டறிதல் பற்றிய உங்கள் கேள்வியை தட்டச்சு செய்யவும்..." : "Type your question about the diagnosis..."}
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
              {submittingDoubt
                ? (lang === "ta" ? "சமர்ப்பிக்கிறது..." : "Submitting...")
                : (lang === "ta" ? "கேள்வியை சமர்ப்பிக்கவும்" : "Submit Question")}
            </Button>
          </CardContent>
        </Card>

        {/* Recommended Doctors */}
        {(result.severity === "medium" || result.severity === "high") && (
          <Card className="border-border shadow-card">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-3">
                {lang === "ta" ? "பரிந்துரைக்கப்பட்ட மருத்துவர்கள்" : "Recommended Doctors"}
              </h3>
              {doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lang === "ta" ? "தற்போது சரிபார்க்கப்பட்ட மருத்துவர்கள் இல்லை." : "No verified doctors available at the moment."}
                </p>
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
                        {lang === "ta" ? "முன்பதிவு" : "Book"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          {lang === "ta"
            ? "⚠️ இது AI உடல்நல திரையிடல் மட்டுமே, மருத்துவ கண்டறிதல் அல்ல. எப்போதும் சுகாதார நிபுணரை அணுகவும்."
            : "⚠️ This is AI-powered health screening only, not a medical diagnosis. No prescription is generated automatically. Always consult a healthcare professional."}
        </p>
      </div>
    </div>
  );
};

export default ScanResults;