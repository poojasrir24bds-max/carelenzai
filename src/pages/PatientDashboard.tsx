import { useNavigate } from "react-router-dom";
import { ScanLine, History, Calendar, User, LogOut, Stethoscope, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo.png";

const scanAreas = [
  { id: "skin", label: "Skin", emoji: "🖐️" },
  { id: "hair", label: "Hair", emoji: "💇" },
  { id: "eyes", label: "Eyes", emoji: "👁️" },
  { id: "nails", label: "Nails", emoji: "💅" },
  { id: "lips", label: "Lips", emoji: "👄" },
  { id: "scalp", label: "Scalp", emoji: "🧠" },
];

const recentScans = [
  { area: "Skin", date: "Mar 5, 2026", severity: "low" as const, condition: "Mild dryness detected" },
  { area: "Hair", date: "Mar 3, 2026", severity: "medium" as const, condition: "Thinning pattern noted" },
  { area: "Nails", date: "Feb 28, 2026", severity: "high" as const, condition: "Discoloration found" },
];

const severityColors = {
  low: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  high: "bg-destructive text-destructive-foreground",
};

const severityLabels = { low: "Low Risk", medium: "Medium Risk", high: "High Risk" };

const PatientDashboard = () => {
  const navigate = useNavigate();

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
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
          </button>
          <button onClick={() => navigate("/")} className="text-primary-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="font-display text-2xl font-bold">Hello, Patient 👋</h1>
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
            {scanAreas.map((area) => (
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

        {/* Recent Scans */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">Recent Scans</h2>
            <button className="text-primary text-sm font-medium flex items-center gap-1">
              <History className="h-4 w-4" /> View All
            </button>
          </div>
          <div className="space-y-3">
            {recentScans.map((scan, i) => (
              <Card key={i} className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all" onClick={() => navigate("/patient/results")}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{scan.area} Scan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{scan.date}</p>
                    <p className="text-xs text-muted-foreground">{scan.condition}</p>
                  </div>
                  <span className={`${severityColors[scan.severity]} text-xs font-semibold px-3 py-1 rounded-full`}>
                    {severityLabels[scan.severity]}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
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
