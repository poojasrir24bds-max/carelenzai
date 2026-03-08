import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, BookOpen, MessageCircle, Clock, GraduationCap, Shield } from "lucide-react";
import DentalBottomNav from "@/components/dental/BottomNav";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";

const DentalHome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const features = [
    { icon: ScanLine, label: "Scan Dental Image", desc: "AI-powered dental analysis", path: "/dental/scan", color: "bg-primary/10 text-primary" },
    { icon: Clock, label: "Scan History", desc: "View past scan reports", path: "/dental/history", color: "bg-secondary/10 text-secondary" },
    { icon: BookOpen, label: "Study Mode", desc: "Learn dental concepts", path: "/dental/study", color: "bg-accent text-accent-foreground" },
    { icon: MessageCircle, label: "AI Assistant", desc: "Ask dental questions", path: "/dental/chat", color: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,45%)] px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="DentalScan AI" className="h-8 w-8" />
            <span className="font-display font-bold text-white text-lg">DentalScan AI</span>
          </div>
          <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" onClick={async () => { await signOut(); navigate("/"); }}>
            Sign Out
          </Button>
        </div>
        <div>
          <h1 className="text-white font-display text-xl font-bold">Welcome back! 🦷</h1>
          <p className="text-white/80 text-sm mt-0.5">Your AI dental learning companion</p>
        </div>
      </header>

      <div className="flex-1 container py-5 space-y-5">
        {/* Quick Actions */}
        <div>
          <h2 className="font-display font-semibold text-base mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f) => (
              <Card
                key={f.label}
                className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all active:scale-[0.98]"
                onClick={() => navigate(f.path)}
              >
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tips */}
        <Card className="bg-primary/5 border-primary/20 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Dental Learning Tip</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the FDI tooth numbering system: Upper right starts at 11, upper left at 21, lower left at 31, and lower right at 41.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
          <p className="text-xs text-foreground flex items-start gap-1.5">
            <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span><strong>Educational Tool:</strong> DentalScan AI is for educational purposes only. It does not replace professional dental diagnosis or treatment planning.</span>
          </p>
        </div>
      </div>

      <DentalBottomNav />
    </div>
  );
};

export default DentalHome;
