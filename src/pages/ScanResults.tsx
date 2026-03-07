import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, CheckCircle, ShieldAlert, Stethoscope, Droplets, Salad, Heart, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

const mockResult = {
  area: "Skin",
  condition: "Contact Dermatitis",
  severity: "medium" as const,
  confidence: 82,
  possibleCauses: [
    "Allergic reaction to cosmetics or chemicals",
    "Environmental exposure (pollen, dust)",
    "Stress-related skin sensitivity",
    "Nutritional deficiency (Vitamin D, Zinc)",
  ],
  guidance: [
    { icon: Droplets, text: "Keep the area clean and moisturized" },
    { icon: Salad, text: "Increase intake of Vitamin C and Zinc-rich foods" },
    { icon: Heart, text: "Manage stress through exercise and rest" },
    { icon: Sparkles, text: "Avoid harsh soaps and chemical irritants" },
  ],
  doctors: [
    { name: "Dr. Priya Sharma", specialty: "Dermatologist", available: true, rating: 4.8 },
    { name: "Dr. Arjun Patel", specialty: "Dermatologist", available: true, rating: 4.6 },
    { name: "Dr. Meera Gupta", specialty: "General Physician", available: false, rating: 4.5 },
  ],
};

const severityConfig = {
  low: { color: "bg-success", textColor: "text-success", label: "🟢 Low Risk", desc: "Normal or mild issue — no immediate concern" },
  medium: { color: "bg-warning", textColor: "text-warning", label: "🟡 Medium Risk", desc: "Monitor condition and consider a doctor consultation" },
  high: { color: "bg-destructive", textColor: "text-destructive", label: "🔴 High Risk", desc: "Doctor consultation recommended immediately" },
};

const ScanResults = () => {
  const navigate = useNavigate();
  const sev = severityConfig[mockResult.severity];

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
              {mockResult.severity === "low" && <CheckCircle className="h-4 w-4" />}
              {mockResult.severity === "medium" && <AlertTriangle className="h-4 w-4" />}
              {mockResult.severity === "high" && <ShieldAlert className="h-4 w-4" />}
              {sev.label}
            </div>
            <h2 className="font-display text-xl font-bold">{mockResult.condition}</h2>
            <p className="text-muted-foreground text-sm mt-1">{mockResult.area} Analysis • {mockResult.confidence}% confidence</p>
            <p className="text-sm mt-2">{sev.desc}</p>
          </CardContent>
        </Card>

        {/* Possible Causes */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-3">Possible Causes</h3>
            <div className="space-y-2">
              {mockResult.possibleCauses.map((cause, i) => (
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
              {mockResult.guidance.map((g, i) => (
                <div key={i} className="flex items-center gap-3 bg-accent/50 rounded-xl p-3">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <g.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm">{g.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommended Doctors */}
        {(mockResult.severity === "medium" || mockResult.severity === "high") && (
          <Card className="border-border shadow-card">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-3">Recommended Doctors</h3>
              <div className="space-y-3">
                {mockResult.doctors.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-full p-2.5">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialty} • ⭐ {doc.rating}</p>
                      </div>
                    </div>
                    <Button size="sm" variant={doc.available ? "default" : "outline"} disabled={!doc.available} className="rounded-lg text-xs">
                      {doc.available ? "Book" : "Unavailable"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          ⚠️ This is AI-powered health awareness only, not a medical diagnosis. Always consult a healthcare professional.
        </p>
      </div>
    </div>
  );
};

export default ScanResults;
