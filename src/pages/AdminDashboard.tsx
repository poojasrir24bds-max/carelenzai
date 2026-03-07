import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, Stethoscope, ScanLine, DollarSign, CheckCircle, XCircle, BarChart3, Shield, Settings } from "lucide-react";
import logo from "@/assets/logo.png";

const pendingDoctors = [
  { name: "Dr. Rahul Mehta", specialty: "Trichologist", license: "ML-67890" },
  { name: "Dr. Kavita Singh", specialty: "Ophthalmologist", license: "ML-54321" },
];

const allUsers = [
  { name: "Anita Roy", role: "Patient", status: "Active", joined: "Feb 2026" },
  { name: "Raj Kumar", role: "Patient", status: "Active", joined: "Jan 2026" },
  { name: "Dr. Priya Sharma", role: "Doctor", status: "Verified", joined: "Jan 2026" },
  { name: "Sita Devi", role: "Patient", status: "Expired", joined: "Dec 2025" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">Admin Panel</span>
        </div>
        <button onClick={() => navigate("/")} className="text-primary-foreground">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 container py-6 space-y-5">
        <h1 className="font-display text-2xl font-bold">Admin Dashboard 🛡️</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Total Users", value: "1,247", color: "text-primary" },
            { icon: Stethoscope, label: "Doctors", value: "89", color: "text-secondary" },
            { icon: ScanLine, label: "Scans Today", value: "342", color: "text-warning" },
            { icon: DollarSign, label: "Revenue", value: "₹1.2L", color: "text-success" },
          ].map((s) => (
            <Card key={s.label} className="shadow-card border-border">
              <CardContent className="p-4">
                <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
                <p className="font-bold text-xl">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Pending Approvals */}
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-warning" /> Pending Doctor Approvals
                </h3>
                <div className="space-y-3">
                  {pendingDoctors.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialty} • {doc.license}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="rounded-lg h-7 text-xs px-2.5">
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs px-2.5">
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BarChart3, label: "Analytics" },
                { icon: Settings, label: "Settings" },
              ].map((a) => (
                <Card key={a.label} className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all">
                  <CardContent className="p-4 text-center">
                    <a.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-medium text-sm">{a.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="mt-4 space-y-3">
            {pendingDoctors.map((doc, i) => (
              <Card key={i} className="shadow-card border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary/20 rounded-full p-2.5">
                      <Stethoscope className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                    </div>
                  </div>
                  <span className="bg-warning/20 text-warning text-xs font-medium px-2.5 py-0.5 rounded-full">Pending</span>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-3">
            {allUsers.map((user, i) => (
              <Card key={i} className="shadow-card border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.role} • Joined {user.joined}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    user.status === "Active" ? "bg-success/20 text-success" :
                    user.status === "Verified" ? "bg-primary/20 text-primary" :
                    "bg-destructive/20 text-destructive"
                  }`}>
                    {user.status}
                  </span>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card className="shadow-card border-border">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">Revenue Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Patient Subs", value: "₹84,150", count: "851 active" },
                    { label: "Doctor Subs", value: "₹15,711", count: "79 active" },
                    { label: "Total Revenue", value: "₹99,861", count: "This month" },
                    { label: "Payouts Due", value: "₹32,400", count: "12 doctors" },
                  ].map((p) => (
                    <div key={p.label} className="bg-accent/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">{p.label}</p>
                      <p className="font-bold text-lg">{p.value}</p>
                      <p className="text-xs text-muted-foreground">{p.count}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
