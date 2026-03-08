import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, BookOpen, MessageCircle, Clock, GraduationCap, Shield, Eye, Hand, Scissors, Lock, Crown } from "lucide-react";
import DentalBottomNav from "@/components/dental/BottomNav";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";

const scanAreas = [
  { id: "dental", label: "Dental", emoji: "🦷", desc: "Teeth & gums" },
  { id: "skin", label: "Skin", emoji: "🖐️", desc: "Skin conditions" },
  { id: "hair", label: "Hair", emoji: "💇", desc: "Hair & scalp" },
  { id: "eyes", label: "Eyes", emoji: "👁️", desc: "Eye health" },
  { id: "nails", label: "Nails", emoji: "💅", desc: "Nail conditions" },
  { id: "lips", label: "Lips", emoji: "👄", desc: "Lip health" },
  { id: "scalp", label: "Scalp", emoji: "🧠", desc: "Scalp issues" },
];

const quickActions = [
  { icon: Clock, label: "Scan History", desc: "View past reports", path: "/dental/history", color: "bg-secondary/10 text-secondary" },
  { icon: BookOpen, label: "Study Mode", desc: "Learn medical concepts", path: "/dental/study", color: "bg-accent text-accent-foreground" },
  { icon: MessageCircle, label: "AI Assistant", desc: "Ask health questions", path: "/dental/chat", color: "bg-warning/10 text-warning" },
];

const severityColors: Record<string, string> = {
  low: "bg-success text-success-foreground",
  normal: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  moderate: "bg-warning text-warning-foreground",
  high: "bg-destructive text-destructive-foreground",
  severe: "bg-destructive text-destructive-foreground",
};

const DentalHome = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [recentScans, setRecentScans] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchRecentScans();
  }, [user]);

  const fetchRecentScans = async () => {
    // Fetch both body scans and dental scans
    const [bodyRes, dentalRes] = await Promise.all([
      supabase.from("scans").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("dental_scans").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(3),
    ]);

    const bodyScans = (bodyRes.data || []).map((s: any) => ({ ...s, scanMode: "body", displayLabel: `${s.area} Scan`, displayCondition: s.condition }));
    const dentalScans = (dentalRes.data || []).map((s: any) => ({ ...s, scanMode: "dental", displayLabel: `Dental (${s.scan_type})`, displayCondition: s.overall_assessment?.slice(0, 60) }));

    const combined = [...bodyScans, ...dentalScans]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    setRecentScans(combined);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,45%)] px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="CareLenz AI" className="h-8 w-8" />
            <span className="font-display font-bold text-white text-lg">CareLenz AI</span>
          </div>
          <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" onClick={async () => { await signOut(); navigate("/"); }}>
            Sign Out
          </Button>
        </div>
        <div>
          <h1 className="text-white font-display text-xl font-bold">Welcome, {profile?.full_name || "User"} 👋</h1>
          <p className="text-white/80 text-sm mt-0.5">Your AI health & dental companion</p>
        </div>
      </header>

      <div className="flex-1 container py-5 space-y-5">
        {/* Scan CTA */}
        <Card className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,45%)] border-0 shadow-elevated overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-white">Start AI Scan</h2>
              <p className="text-white/80 text-sm mt-1">Dental, skin, eyes, hair & more</p>
            </div>
            <Button variant="secondary" size="lg" onClick={() => navigate("/dental/scan")} className="rounded-xl font-semibold">
              <ScanLine className="h-5 w-5 mr-2" /> Scan Now
            </Button>
          </CardContent>
        </Card>

        {/* Scan Areas Grid */}
        <div>
          <h2 className="font-display font-semibold text-base mb-3">Scan Area</h2>
          <div className="grid grid-cols-4 gap-2">
            {scanAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => navigate("/dental/scan")}
                className="bg-card rounded-2xl p-3 shadow-card border border-border hover:border-primary hover:shadow-elevated transition-all text-center active:scale-[0.97]"
              >
                <span className="text-xl block mb-1">{area.emoji}</span>
                <span className="text-xs font-medium">{area.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="font-display font-semibold text-base mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((f) => (
              <Card
                key={f.label}
                className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all active:scale-[0.98]"
                onClick={() => navigate(f.path)}
              >
                <CardContent className="p-3 text-center">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 ${f.color}`}>
                    <f.icon className="h-4 w-4" />
                  </div>
                  <p className="font-semibold text-xs">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-base">Recent Scans</h2>
              <button onClick={() => navigate("/dental/history")} className="text-primary text-xs font-medium">View All</button>
            </div>
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <Card
                  key={scan.id}
                  className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all"
                  onClick={() => navigate("/dental/results", {
                    state: scan.scanMode === "dental"
                      ? { result: scan, scanId: scan.id, scanMode: "dental" }
                      : { result: { condition: scan.condition, definition: scan.definition, causes: scan.causes, severity: scan.severity, confidence: scan.confidence, guidance: scan.guidance }, scanId: scan.id, scanMode: "body" },
                  })}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm capitalize">{scan.displayLabel}</p>
                      <p className="text-xs text-muted-foreground">{new Date(scan.created_at).toLocaleDateString()}</p>
                      {scan.displayCondition && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{scan.displayCondition}</p>}
                    </div>
                    {scan.severity && (
                      <span className={`${severityColors[scan.severity] || "bg-muted text-muted-foreground"} text-[10px] font-semibold px-2.5 py-1 rounded-full`}>
                        {scan.severity}
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <Card className="bg-primary/5 border-primary/20 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Health Tip</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Regular dental check-ups every 6 months can prevent 90% of dental issues. Use the AI scanner to monitor your dental and skin health between visits.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
          <p className="text-xs text-foreground flex items-start gap-1.5">
            <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span><strong>AI Screening Only:</strong> This tool is for educational and awareness purposes. It does not replace professional medical or dental diagnosis.</span>
          </p>
        </div>
      </div>

      <DentalBottomNav />
    </div>
  );
};

export default DentalHome;
