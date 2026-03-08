import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Volume2, VolumeX, AlertTriangle, CheckCircle, Info } from "lucide-react";
import DentalBottomNav from "@/components/dental/BottomNav";
import logo from "@/assets/logo.png";
import { useState } from "react";

const severityConfig: Record<string, { color: string; icon: any; label: string }> = {
  normal: { color: "bg-success/20 text-success", icon: CheckCircle, label: "Normal" },
  mild: { color: "bg-primary/20 text-primary", icon: Info, label: "Mild" },
  moderate: { color: "bg-warning/20 text-warning", icon: AlertTriangle, label: "Moderate" },
  severe: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "Severe" },
};

const DentalResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  const speakText = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = `Dental Analysis Results. Severity: ${result.severity}. Confidence: ${result.confidence} percent. 
    Overall assessment: ${result.overall_assessment}. 
    Conditions found: ${result.conditions_found?.join(", ") || "None"}. 
    Clinical notes: ${result.clinical_notes?.join(". ") || "None"}.
    Recommendations: ${result.recommendations?.join(". ") || "None"}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,45%)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dental")} className="text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="DentalScan AI" className="h-7 w-7" />
            <span className="font-display font-bold text-white">Analysis Results</span>
          </div>
        </div>
        <button onClick={speakText} className="bg-white/20 rounded-full p-2">
          {isSpeaking ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
        </button>
      </header>

      <div className="flex-1 container py-5 space-y-4">
        {/* Severity & Confidence */}
        <div className="flex gap-3">
          <Card className="flex-1 shadow-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`rounded-full p-2 ${severity.color}`}>
                <SeverityIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Severity</p>
                <p className="font-bold text-sm capitalize">{result.severity}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1 shadow-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="font-bold text-xl text-primary">{result.confidence}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Assessment */}
        <Card className="shadow-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">📋 Overall Assessment</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.overall_assessment}</p>
          </CardContent>
        </Card>

        {/* Teeth Identified */}
        {result.teeth_identified?.length > 0 && (
          <Card className="shadow-card border-border">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">🦷 Teeth Identified (FDI)</h3>
              <div className="space-y-2.5">
                {result.teeth_identified.map((tooth: any, i: number) => (
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

        {/* Conditions Found */}
        {result.conditions_found?.length > 0 && (
          <Card className="shadow-card border-border">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">⚠️ Conditions Detected</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.conditions_found.map((c: string, i: number) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">{c}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clinical Notes */}
        {result.clinical_notes?.length > 0 && (
          <Card className="bg-primary/5 border-primary/20 shadow-card">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">📝 Clinical Notes (For Students)</h3>
              <ul className="space-y-1.5">
                {result.clinical_notes.map((note: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">•</span> {note}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {result.recommendations?.length > 0 && (
          <Card className="shadow-card border-border">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">💡 Recommendations</h3>
              <ul className="space-y-1.5">
                {result.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-success font-bold mt-0.5">{i + 1}.</span> {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
          <p className="text-xs text-foreground">
            ⚠️ <strong>Educational Screening Only:</strong> This AI analysis is for learning purposes. It does not replace professional dental diagnosis. Consult a licensed dentist for clinical decisions.
          </p>
        </div>

        <Button className="w-full rounded-xl h-12" onClick={() => navigate("/dental/scan")}>
          🦷 Scan Another Image
        </Button>
      </div>

      <DentalBottomNav />
    </div>
  );
};

export default DentalResults;
