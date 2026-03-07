import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Bell, Calendar, Clock, Users, CheckCircle, XCircle, FileText, Stethoscope } from "lucide-react";
import logo from "@/assets/logo.png";

const consultations = [
  { patient: "Anita Roy", area: "Skin", severity: "high", date: "Mar 7, 2026", status: "pending" },
  { patient: "Raj Kumar", area: "Hair", severity: "medium", date: "Mar 6, 2026", status: "accepted" },
  { patient: "Sita Devi", area: "Nails", severity: "high", date: "Mar 5, 2026", status: "completed" },
];

const sevColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("consultations");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">Doctor Portal</span>
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

      <div className="flex-1 container py-6 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold">Dr. Priya Sharma 👩‍⚕️</h1>
          <p className="text-muted-foreground text-sm">Dermatologist • City Medical Center</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Patients", value: "24" },
            { icon: Calendar, label: "Today", value: "5" },
            { icon: Clock, label: "Pending", value: "3" },
          ].map((s) => (
            <Card key={s.label} className="shadow-card border-border">
              <CardContent className="p-3 text-center">
                <s.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-bold text-lg">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="consultations" className="flex-1">Consultations</TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1">Schedule</TabsTrigger>
            <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="space-y-3 mt-4">
            {consultations.map((c, i) => (
              <Card key={i} className="shadow-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 rounded-full p-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{c.patient}</p>
                        <p className="text-xs text-muted-foreground">{c.area} Scan • {c.date}</p>
                      </div>
                    </div>
                    <span className={`${sevColors[c.severity]} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
                      {c.severity}
                    </span>
                  </div>
                  {c.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1 rounded-lg text-xs">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs">
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                      </Button>
                    </div>
                  )}
                  {c.status === "accepted" && (
                    <Button size="sm" variant="outline" className="w-full mt-3 rounded-lg text-xs">
                      <FileText className="h-3.5 w-3.5 mr-1" /> View Scan Summary
                    </Button>
                  )}
                  {c.status === "completed" && (
                    <p className="text-xs text-success mt-2 font-medium">✓ Consultation completed</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <Card className="shadow-card border-border">
              <CardContent className="p-5 text-center">
                <Calendar className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Manage Availability</h3>
                <p className="text-sm text-muted-foreground mb-3">Set your available time slots for consultations</p>
                <Button className="rounded-xl">Set Schedule</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <Card className="shadow-card border-border">
              <CardContent className="p-5 space-y-3">
                {[
                  ["Name", "Dr. Priya Sharma"],
                  ["Specialization", "Dermatologist"],
                  ["License", "ML-12345"],
                  ["Hospital", "City Medical Center"],
                  ["Status", "✅ Verified"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DoctorDashboard;
