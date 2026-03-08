import { useNavigate } from "react-router-dom";
import { ScanLine, History, Calendar, User, LogOut, Stethoscope, Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const scanAreaItems = [
  { id: "skin", label: "Skin", emoji: "🖐️" },
  { id: "hair", label: "Hair", emoji: "💇" },
  { id: "eyes", label: "Eyes", emoji: "👁️" },
  { id: "nails", label: "Nails", emoji: "💅" },
  { id: "lips", label: "Lips", emoji: "👄" },
  { id: "scalp", label: "Scalp", emoji: "🧠" },
];

const severityColors = {
  low: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  high: "bg-destructive text-destructive-foreground",
};

const severityLabels = { low: "Low Risk", medium: "Medium Risk", high: "High Risk" };

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
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
    const { error } = await supabase.from("patient_doubts").insert({
      patient_id: user.id,
      question: doubtText.trim(),
    });
    setSubmittingDoubt(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Question submitted!" });
      setDoubtText("");
      fetchDoubts();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">HealthScan AI</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-primary-foreground relative">
            <Bell className="h-5 w-5" />
          </button>
          <button onClick={handleLogout} className="text-primary-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="font-display text-2xl font-bold">Hello, {profile?.full_name || "Patient"} 👋</h1>
          <p className="text-muted-foreground text-sm">How are you feeling today?</p>
        </div>

        {/* Quick Scan CTA */}
        <Card className="gradient-primary border-0 shadow-elevated overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-primary-foreground">Start Health Scan</h2>
              <p className="text-primary-foreground/80 text-sm mt-1">Upload image or use camera</p>
            </div>
            <Button variant="secondary" size="lg" onClick={() => navigate("/patient/scan")} className="rounded-xl font-semibold">
              <ScanLine className="h-5 w-5 mr-2" /> Scan Now
            </Button>
          </CardContent>
        </Card>

        {/* Scan Area Selection */}
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Scan Area</h2>
          <div className="grid grid-cols-3 gap-3">
            {scanAreaItems.map((area) => (
              <button
                key={area.id}
                onClick={() => navigate("/patient/scan")}
                className="bg-card rounded-2xl p-4 shadow-card border border-border hover:border-primary hover:shadow-elevated transition-all text-center"
              >
                <span className="text-2xl block mb-1">{area.emoji}</span>
                <span className="text-sm font-medium">{area.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Patient Doubt Box */}
        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Ask a Doctor
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Type your health question. A doctor will review and respond.</p>
            <Textarea
              placeholder="e.g., Why does my skin feel itchy after sun exposure?"
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <Button onClick={handleSubmitDoubt} disabled={!doubtText.trim() || submittingDoubt} className="w-full rounded-xl" size="sm">
              {submittingDoubt ? "Submitting..." : "Submit Question"}
            </Button>

            {myDoubts.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Your recent questions:</p>
                {myDoubts.map((d) => (
                  <div key={d.id} className="bg-accent/30 rounded-lg p-2.5">
                    <p className="text-xs font-medium">{d.question}</p>
                    {d.answer ? (
                      <p className="text-xs text-success mt-1">✓ {d.answer}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">⏳ Awaiting doctor response</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">Recent Scans</h2>
            <button className="text-primary text-sm font-medium flex items-center gap-1">
              <History className="h-4 w-4" /> View All
            </button>
          </div>
          {recentScans.length === 0 ? (
            <Card className="shadow-card border-border">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">No previous scans found. Start your first scan above!</p>
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
                      <p className="font-semibold text-sm capitalize">{scan.area} Scan</p>
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

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 pb-4">
          <button className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all">
            <Stethoscope className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">Find Doctor</span>
          </button>
          <button className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all">
            <Calendar className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">Appointments</span>
          </button>
          <button className="bg-card rounded-2xl p-4 shadow-card border border-border text-center hover:shadow-elevated transition-all">
            <User className="h-6 w-6 text-primary mx-auto mb-1" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
