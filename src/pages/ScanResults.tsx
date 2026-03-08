import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertTriangle, CheckCircle, ShieldAlert, Stethoscope, Droplets, Salad, Heart, Sparkles, Volume2, MessageSquare } from "lucide-react";
import logo from "@/assets/logo.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const severityConfig = {
  low: { color: "bg-success", textColor: "text-success", label: "🟢 Low Risk", desc: "Normal or mild issue — no immediate concern" },
  medium: { color: "bg-warning", textColor: "text-warning", label: "🟡 Medium Risk", desc: "Monitor condition and consider a doctor consultation" },
  high: { color: "bg-destructive", textColor: "text-destructive", label: "🔴 High Risk", desc: "Doctor consultation recommended immediately" },
};

const guidanceIcons = [Droplets, Salad, Heart, Sparkles];

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
  const [isSpeaking, setIsSpeaking] = useState(false);

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
    const { error } = await supabase.from("patient_doubts").insert({
      patient_id: user.id,
      scan_id: scanId || null,
      question: doubtText.trim(),
    });
    setSubmittingDoubt(false);
    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Question submitted!", description: "A doctor will review your question." });
      setDoubtText("");
    }
  };

  const handlePlayAudio = (lang: "en" | "ta") => {
    if (!result || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const text = lang === "en"
      ? `Condition: ${result.condition}. ${result.definition}. Severity: ${result.severity} risk. ${result.guidance?.join(". ")}`
      : `நிலை: ${result.condition}. ${result.definition}. தீவிரம்: ${result.severity} அபாயம்.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "ta-IN";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/patient")} className="text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">Scan Results</span>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-5">
        {/* Severity Badge */}
        <Card className="border-border shadow-elevated">
          <CardContent className="p-5 text-center">
            <div className={`inline-flex items-center gap-2 ${sev.color} text-primary-foreground rounded-full px-5 py-2 font-bold text-sm mb-3`}>
              {result.severity === "low" && <CheckCircle className="h-4 w-4" />}
              {result.severity === "medium" && <AlertTriangle className="h-4 w-4" />}
              {result.severity === "high" && <ShieldAlert className="h-4 w-4" />}
              {sev.label}
            </div>
            <h2 className="font-display text-xl font-bold">{result.condition}</h2>
            <p className="text-muted-foreground text-sm mt-1">{result.confidence}% confidence</p>
            <p className="text-sm mt-2">{sev.desc}</p>
          </CardContent>
        </Card>

        {/* Voiceover Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl"
            onClick={() => handlePlayAudio("en")}
            disabled={isSpeaking}
          >
            <Volume2 className="h-4 w-4 mr-2" /> Play in English
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl"
            onClick={() => handlePlayAudio("ta")}
            disabled={isSpeaking}
          >
            <Volume2 className="h-4 w-4 mr-2" /> தமிழில் கேளுங்கள்
          </Button>
        </div>

        {/* Definition */}
        {result.definition && (
          <Card className="border-border shadow-card">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-2">What is {result.condition}?</h3>
              <p className="text-sm text-muted-foreground">{result.definition}</p>
            </CardContent>
          </Card>
        )}

        {/* Possible Causes */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-3">Possible Causes</h3>
            <div className="space-y-2">
              {(result.causes || []).map((cause: string, i: number) => (
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
            <h3 className="font-display font-semibold mb-3">Health Guidance</h3>
            <div className="space-y-3">
              {(result.guidance || []).map((text: string, i: number) => {
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
              <MessageSquare className="h-5 w-5 text-primary" /> Ask a Question
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Have doubts about your diagnosis? Ask here and a doctor will review your question.
            </p>
            <Textarea
              placeholder="Type your question about the diagnosis..."
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
              {submittingDoubt ? "Submitting..." : "Submit Question"}
            </Button>
          </CardContent>
        </Card>

        {/* Recommended Doctors */}
        {(result.severity === "medium" || result.severity === "high") && (
          <Card className="border-border shadow-card">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-3">Recommended Doctors</h3>
              {doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No verified doctors available at the moment.</p>
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
                        Book
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
          ⚠️ This is AI-powered health screening only, not a medical diagnosis. No prescription is generated automatically. Always consult a healthcare professional.
        </p>
      </div>
    </div>
  );
};

export default ScanResults;
