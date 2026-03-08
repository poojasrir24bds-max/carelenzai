import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Volume2, VolumeX, AlertTriangle, CheckCircle, Info, Globe, Loader2 } from "lucide-react";
import DentalBottomNav from "@/components/dental/BottomNav";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const severityConfig: Record<string, { color: string; icon: any; label: string; labelTa: string }> = {
  normal: { color: "bg-success/20 text-success", icon: CheckCircle, label: "Normal", labelTa: "இயல்பு" },
  low: { color: "bg-success/20 text-success", icon: CheckCircle, label: "Low", labelTa: "குறைவு" },
  mild: { color: "bg-primary/20 text-primary", icon: Info, label: "Mild", labelTa: "லேசான" },
  medium: { color: "bg-warning/20 text-warning", icon: AlertTriangle, label: "Medium", labelTa: "நடுத்தரம்" },
  moderate: { color: "bg-warning/20 text-warning", icon: AlertTriangle, label: "Moderate", labelTa: "மிதமான" },
  high: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "High", labelTa: "அதிகம்" },
  severe: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "Severe", labelTa: "கடுமையான" },
};

type TranslatedDentalResult = {
  overall_assessment: string;
  conditions_found: string[];
  clinical_notes: string[];
  recommendations: string[];
  teeth_identified: { tooth_number: string; condition: string; description: string }[];
};

type TranslatedBodyResult = {
  condition: string;
  definition: string;
  causes: string[];
  guidance: string[];
};

const DentalResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const scanMode = location.state?.scanMode || "dental";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lang, setLang] = useState<"en" | "ta">("en");
  const [translating, setTranslating] = useState(false);
  const [translatedDental, setTranslatedDental] = useState<TranslatedDentalResult | null>(null);
  const [translatedBody, setTranslatedBody] = useState<TranslatedBodyResult | null>(null);

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center">
          <p className="text-muted-foreground">No scan results found.</p>
          <Button className="mt-4" onClick={() => navigate("/dental/scan")}>Start New Scan</Button>
        </div>
        <DentalBottomNav />
      </div>
    );
  }

  const severity = severityConfig[result.severity] || severityConfig.normal;
  const SeverityIcon = severity.icon;
  const isDental = scanMode === "dental";

  const handleSwitchLang = async (newLang: "en" | "ta") => {
    if (newLang === lang) return;
    if (newLang === "en") { setLang("en"); return; }

    // Already translated
    if (isDental && translatedDental) { setLang("ta"); return; }
    if (!isDental && translatedBody) { setLang("ta"); return; }

    setTranslating(true);
    try {
      if (isDental) {
        const fullText = [
          `Overall Assessment: ${result.overall_assessment || ""}`,
          `Conditions Found: ${(result.conditions_found || []).join(" | ")}`,
          `Clinical Notes: ${(result.clinical_notes || []).join(" | ")}`,
          `Recommendations: ${(result.recommendations || []).join(" | ")}`,
          `Teeth: ${(result.teeth_identified || []).map((t: any) => `#${t.tooth_number} - ${t.condition}: ${t.description}`).join(" | ")}`,
        ].join("\n");

        const { data, error } = await supabase.functions.invoke("translate", {
          body: { text: fullText, targetLang: "Tamil (தமிழ்)" },
        });

        if (!error && data?.translated) {
          // Parse the translated text back into structured format
          const lines = data.translated.split("\n");
          const parsed: TranslatedDentalResult = {
            overall_assessment: "",
            conditions_found: [],
            clinical_notes: [],
            recommendations: [],
            teeth_identified: [],
          };
          for (const line of lines) {
            if (line.startsWith("Overall Assessment:") || line.includes("ஒட்டுமொத்த மதிப்பீடு")) {
              parsed.overall_assessment = line.split(":").slice(1).join(":").trim();
            } else if (line.startsWith("Conditions Found:") || line.includes("நிலைமைகள்")) {
              parsed.conditions_found = line.split(":").slice(1).join(":").trim().split(" | ").filter(Boolean);
            } else if (line.startsWith("Clinical Notes:") || line.includes("குறிப்புகள்")) {
              parsed.clinical_notes = line.split(":").slice(1).join(":").trim().split(" | ").filter(Boolean);
            } else if (line.startsWith("Recommendations:") || line.includes("பரிந்துரைகள்")) {
              parsed.recommendations = line.split(":").slice(1).join(":").trim().split(" | ").filter(Boolean);
            }
          }
          // If parsing didn't work well, use the whole text as assessment
          if (!parsed.overall_assessment && !parsed.conditions_found.length) {
            parsed.overall_assessment = data.translated;
          }
          setTranslatedDental(parsed);
          setLang("ta");
        }
      } else {
        // Body scan - use structured translation
        const { data, error } = await supabase.functions.invoke("translate", {
          body: {
            targetLang: "Tamil (தமிழ்)",
            structuredResult: {
              condition: result.condition,
              definition: result.definition,
              severityDesc: "",
              causes: result.causes || [],
              guidance: Array.isArray(result.guidance) ? result.guidance : [],
            },
          },
        });
        if (!error && data?.translatedResult) {
          setTranslatedBody(data.translatedResult);
          setLang("ta");
        }
      }
    } catch (e) {
      console.error("Translation error:", e);
    } finally {
      setTranslating(false);
    }
  };

  // Display data based on language
  const d = isDental ? {
    assessment: lang === "ta" && translatedDental ? translatedDental.overall_assessment : result.overall_assessment,
    conditions: lang === "ta" && translatedDental ? translatedDental.conditions_found : result.conditions_found,
    notes: lang === "ta" && translatedDental ? translatedDental.clinical_notes : result.clinical_notes,
    recommendations: lang === "ta" && translatedDental ? translatedDental.recommendations : result.recommendations,
    teeth: lang === "ta" && translatedDental?.teeth_identified?.length ? translatedDental.teeth_identified : result.teeth_identified,
  } : {
    condition: lang === "ta" && translatedBody ? translatedBody.condition : result.condition,
    definition: lang === "ta" && translatedBody ? translatedBody.definition : result.definition,
    causes: lang === "ta" && translatedBody ? translatedBody.causes : result.causes,
    guidance: lang === "ta" && translatedBody ? translatedBody.guidance : (Array.isArray(result.guidance) ? result.guidance : []),
  };

  const speakText = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    let text = "";
    if (isDental) {
      text = lang === "ta" && translatedDental
        ? `பல் பகுப்பாய்வு முடிவுகள். ${translatedDental.overall_assessment}. ${(translatedDental.recommendations || []).join(". ")}`
        : `Dental Analysis Results. Severity: ${result.severity}. Confidence: ${result.confidence} percent. 
        Overall assessment: ${result.overall_assessment}. 
        Conditions found: ${result.conditions_found?.join(", ") || "None"}. 
        Recommendations: ${result.recommendations?.join(". ") || "None"}.`;
    } else {
      const bd = d as { condition: string; definition: string; causes: string[]; guidance: string[] };
      text = lang === "ta" && translatedBody
        ? `உடல்நல ஸ்கேன் முடிவுகள். நிலை: ${bd.condition}. ${bd.definition}. வழிகாட்டுதல்: ${(bd.guidance || []).join(". ")}`
        : `Health Scan Results. Condition: ${result.condition}. Severity: ${result.severity}. Confidence: ${result.confidence} percent.
        Definition: ${result.definition}. Causes: ${result.causes?.join(", ") || "Unknown"}.
        Guidance: ${(Array.isArray(result.guidance) ? result.guidance : []).join(". ") || "None"}.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ta" ? "ta-IN" : "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const labels = {
    resultsTitle: lang === "ta" ? (isDental ? "பல் முடிவுகள்" : "உடல்நல முடிவுகள்") : (isDental ? "Dental Results" : "Health Results"),
    severity: lang === "ta" ? "தீவிரம்" : "Severity",
    confidence: lang === "ta" ? "நம்பிக்கை" : "Confidence",
    assessment: lang === "ta" ? "📋 ஒட்டுமொத்த மதிப்பீடு" : "📋 Overall Assessment",
    teeth: lang === "ta" ? "🦷 கண்டறியப்பட்ட பற்கள் (FDI)" : "🦷 Teeth Identified (FDI)",
    conditions: lang === "ta" ? "⚠️ கண்டறியப்பட்ட நிலைமைகள்" : "⚠️ Conditions Detected",
    clinicalNotes: lang === "ta" ? "📝 மருத்துவக் குறிப்புகள்" : "📝 Clinical Notes",
    recommendations: lang === "ta" ? "💡 பரிந்துரைகள்" : "💡 Recommendations",
    conditionDetected: lang === "ta" ? "🔬 கண்டறியப்பட்ட நிலை" : "🔬 Condition Detected",
    causes: lang === "ta" ? "🧬 சாத்தியமான காரணங்கள்" : "🧬 Possible Causes",
    selfCare: lang === "ta" ? "💊 சுய பராமரிப்பு வழிகாட்டுதல்" : "💊 Self-Care Guidance",
    disclaimer: lang === "ta"
      ? `⚠️ AI பரிசோதனை மட்டுமே: இந்த பகுப்பாய்வு ${isDental ? "கல்வி" : "விழிப்புணர்வு"} நோக்கங்களுக்காக மட்டுமே. சரியான நோயறிதலுக்கு தகுதிவாய்ந்த ${isDental ? "பல் மருத்துவரை" : "சுகாதார நிபுணரை"} அணுகவும்.`
      : `⚠️ AI Screening Only: This analysis is for ${isDental ? "educational" : "awareness"} purposes. Consult a qualified ${isDental ? "dentist" : "healthcare professional"} for proper diagnosis.`,
    scanAnother: lang === "ta" ? "🔬 மற்றொரு படத்தை ஸ்கேன் செய்யுங்கள்" : "🔬 Scan Another Image",
    severityLabel: lang === "ta" ? (severity.labelTa || severity.label) : severity.label,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,45%)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dental")} className="text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="CareLenz AI" className="h-7 w-7" />
            <span className="font-display font-bold text-primary-foreground">{labels.resultsTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={speakText} className="bg-primary-foreground/20 rounded-full p-2">
            {isSpeaking ? <VolumeX className="h-5 w-5 text-primary-foreground" /> : <Volume2 className="h-5 w-5 text-primary-foreground" />}
          </button>
        </div>
      </header>

      <div className="flex-1 container py-5 space-y-4">
        {/* Language Toggle */}
        <div className="flex items-center justify-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-full border border-border overflow-hidden">
            <button
              onClick={() => handleSwitchLang("en")}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              English
            </button>
            <button
              onClick={() => handleSwitchLang("ta")}
              disabled={translating}
              className={`px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${lang === "ta" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} disabled:opacity-50`}
            >
              {translating && <Loader2 className="h-3 w-3 animate-spin" />}
              {translating ? "மொழிபெயர்..." : "தமிழ்"}
            </button>
          </div>
        </div>

        {/* Severity & Confidence */}
        <div className="flex gap-3">
          <Card className="flex-1 shadow-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`rounded-full p-2 ${severity.color}`}>
                <SeverityIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{labels.severity}</p>
                <p className="font-bold text-sm capitalize">{labels.severityLabel}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1 shadow-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{labels.confidence}</p>
              <p className="font-bold text-xl text-primary">{result.confidence}%</p>
            </CardContent>
          </Card>
        </div>

        {/* === DENTAL RESULTS === */}
        {isDental && (
          <>
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-2">{labels.assessment}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.assessment}</p>
              </CardContent>
            </Card>

            {result.teeth_identified?.length > 0 && (
              <Card className="shadow-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">{labels.teeth}</h3>
                  <div className="space-y-2.5">
                    {(d.teeth || []).map((tooth: any, i: number) => (
                      <div key={i} className="border-b border-border pb-2.5 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-primary">#{tooth.tooth_number}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{tooth.condition}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{tooth.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.conditions_found?.length > 0 && (
              <Card className="shadow-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">{labels.conditions}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(d.conditions || []).map((c: string, i: number) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">{c}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.clinical_notes?.length > 0 && (
              <Card className="bg-primary/5 border-primary/20 shadow-card">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">{labels.clinicalNotes}</h3>
                  <ul className="space-y-1.5">
                    {(d.notes || []).map((note: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">•</span> {note}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {result.recommendations?.length > 0 && (
              <Card className="shadow-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">{labels.recommendations}</h3>
                  <ul className="space-y-1.5">
                    {(d.recommendations || []).map((rec: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-success font-bold mt-0.5">{i + 1}.</span> {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* === BODY SCAN RESULTS === */}
        {!isDental && (
          <>
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-1">{labels.conditionDetected}</h3>
                <p className="font-bold text-lg text-primary">{(d as any).condition}</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{(d as any).definition}</p>
              </CardContent>
            </Card>

            {result.causes?.length > 0 && (
              <Card className="shadow-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">{labels.causes}</h3>
                  <ul className="space-y-1.5">
                    {((d as any).causes || []).map((cause: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-warning font-bold mt-0.5">•</span> {cause}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {result.guidance && (
              <Card className="bg-primary/5 border-primary/20 shadow-card">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">{labels.selfCare}</h3>
                  <ul className="space-y-1.5">
                    {((d as any).guidance || []).map((tip: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-success font-bold mt-0.5">{i + 1}.</span> {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Disclaimer */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
          <p className="text-xs text-foreground">{labels.disclaimer}</p>
        </div>

        <Button className="w-full rounded-xl h-12" onClick={() => navigate("/dental/scan")}>
          {labels.scanAnother}
        </Button>
      </div>

      <DentalBottomNav />
    </div>
  );
};

export default DentalResults;
