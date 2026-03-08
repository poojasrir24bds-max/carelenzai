import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, Stethoscope, ScanLine, DollarSign, CheckCircle, XCircle, BarChart3, Shield, Settings } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDoctorProfiles, setAllDoctorProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, doctors: 0, scans: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch all profiles with roles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("created_at", { ascending: false });
    setAllUsers(profiles || []);

    // Fetch pending doctors
    const { data: doctors } = await supabase
      .from("doctor_profiles")
      .select("*")
      .eq("is_verified", false);
    
    // Match doctor profiles with user profiles
    const enrichedDoctors = (doctors || []).map((doc) => {
      const profile = (profiles || []).find((p) => p.user_id === doc.user_id);
      return { ...doc, profiles: profile };
    });
    setPendingDoctors(enrichedDoctors);

    // Fetch all doctor profiles for Doctors tab
    const { data: allDocs } = await supabase.from("doctor_profiles").select("*");
    const enrichedAllDocs = (allDocs || []).map((doc) => {
      const profile = (profiles || []).find((p) => p.user_id === doc.user_id);
      return { ...doc, profiles: profile };
    });
    setAllDoctorProfiles(enrichedAllDocs);

    // Stats
    const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: doctorCount } = await supabase.from("doctor_profiles").select("*", { count: "exact", head: true });
    const { count: scanCount } = await supabase.from("scans").select("*", { count: "exact", head: true });
    setStats({ users: userCount || 0, doctors: doctorCount || 0, scans: scanCount || 0 });
  };

  const handleVerifyDoctor = async (userId: string, approve: boolean) => {
    if (approve) {
      const { error } = await supabase.from("doctor_profiles").update({ is_verified: true }).eq("user_id", userId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Doctor approved!" });
    } else {
      toast({ title: "Doctor registration rejected." });
    }
    fetchData();
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
          <span className="font-display font-bold text-primary-foreground">Admin Panel</span>
        </div>
        <button onClick={handleLogout} className="text-primary-foreground">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 container py-6 space-y-5">
        <h1 className="font-display text-2xl font-bold">Admin Dashboard 🛡️</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Total Users", value: String(stats.users), color: "text-primary" },
            { icon: Stethoscope, label: "Doctors", value: String(stats.doctors), color: "text-secondary" },
            { icon: ScanLine, label: "Total Scans", value: String(stats.scans), color: "text-warning" },
            { icon: DollarSign, label: "Revenue", value: "₹0", color: "text-success" },
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
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-warning" /> Pending Doctor Approvals ({pendingDoctors.length})
                </h3>
                {pendingDoctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending approvals.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingDoctors.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-sm">{doc.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.specialization} • {doc.medical_license}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" className="rounded-lg h-7 text-xs px-2.5" onClick={() => handleVerifyDoctor(doc.user_id, true)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs px-2.5" onClick={() => handleVerifyDoctor(doc.user_id, false)}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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
            {allUsers
              .filter((u) => u.user_roles?.some((r: any) => r.role === "doctor"))
              .map((u) => (
                <Card key={u.id} className="shadow-card border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-secondary/20 rounded-full p-2.5">
                        <Stethoscope className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-3">
            {allUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>
            ) : (
              allUsers.map((user) => (
                <Card key={user.id} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{user.full_name}</p>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        user.user_roles?.[0]?.role === "admin"
                          ? "bg-destructive/20 text-destructive"
                          : user.user_roles?.[0]?.role === "doctor"
                          ? "bg-secondary/20 text-secondary"
                          : "bg-primary/20 text-primary"
                      }`}>
                        {user.user_roles?.[0]?.role || "patient"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">📧 {user.email}</p>
                    <div className="flex gap-4 mt-1.5">
                      {user.age && <p className="text-xs text-muted-foreground">🎂 Age: {user.age}</p>}
                      {user.sex && <p className="text-xs text-muted-foreground">⚧ {user.sex}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">📅 Joined: {new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card className="shadow-card border-border">
              <CardContent className="p-5 text-center">
                <DollarSign className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Payment System</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Stripe integration required for subscription payments. Contact admin to set up.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
