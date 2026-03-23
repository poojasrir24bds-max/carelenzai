import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Users, Stethoscope, ScanLine, DollarSign, CheckCircle, XCircle, BarChart3, Shield, Settings, FileCheck, AlertTriangle, Eye, Loader2, CreditCard, Video, Play, Download, Trash2, Star, MessageSquare } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDoctorProfiles, setAllDoctorProfiles] = useState<any[]>([]);
  const [pendingPatients, setPendingPatients] = useState<any[]>([]);
  const [patientScans, setPatientScans] = useState<Record<string, number>>({});
  const [patientSubs, setPatientSubs] = useState<Record<string, any>>({});
  const [stats, setStats] = useState({ users: 0, doctors: 0, patients: 0, scans: 0, revenue: 0, pendingPatients: 0, subscribedPatients: 0 });
  const [recordings, setRecordings] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [consultationRatings, setConsultationRatings] = useState<any[]>([]);
  const [appRatings, setAppRatings] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [licenseDocUrl, setLicenseDocUrl] = useState<string | null>(null);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchRecordings();
    fetchSubscriptions();
    fetchRatings();

    // Realtime: auto-refresh stats when users/roles/subscriptions change
    const channel = supabase
      .channel('admin-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, () => { fetchData(); fetchSubscriptions(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scans' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dental_scans' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    // Fetch profiles and roles separately to avoid join issues
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    console.log("Admin fetchData - profiles:", profiles?.length, "error:", profilesError?.message);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Merge roles into profiles
    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    const enrichedProfiles = (profiles || []).map((p: any) => ({
      ...p,
      user_roles: roleMap[p.user_id] ? [{ role: roleMap[p.user_id] }] : [],
    }));
    setAllUsers(enrichedProfiles);

    // Pending patients with Aadhaar verification
    const pendingPats = enrichedProfiles.filter(
      (p: any) => p.id_document_url && p.id_verification_status === 'pending'
    );
    setPendingPatients(pendingPats);

    const { data: doctors } = await supabase
      .from("doctor_profiles")
      .select("*")
      .eq("is_verified", false);
    
    const enrichedDoctors = (doctors || []).map((doc) => {
      const profile = enrichedProfiles.find((p: any) => p.user_id === doc.user_id);
      return { ...doc, profiles: profile };
    });
    setPendingDoctors(enrichedDoctors);

    const { data: allDocs } = await supabase.from("doctor_profiles").select("*");
    // Build doctor list from user_roles (role='doctor') enriched with profiles and doctor_profiles
    const doctorRoleUserIds = (roles || []).filter((r: any) => r.role === 'doctor').map((r: any) => r.user_id);
    const enrichedAllDocs = doctorRoleUserIds.map((userId: string) => {
      const profile = enrichedProfiles.find((p: any) => p.user_id === userId);
      const docProfile = (allDocs || []).find((d: any) => d.user_id === userId);
      return {
        id: docProfile?.id || userId,
        user_id: userId,
        profiles: profile,
        hospital_name: docProfile?.hospital_name || 'N/A',
        specialization: docProfile?.specialization || 'N/A',
        medical_license: docProfile?.medical_license || 'N/A',
        doctor_id: docProfile?.doctor_id || 'N/A',
        is_verified: docProfile?.is_verified || false,
        license_verification_status: docProfile?.license_verification_status || 'pending',
        license_document_url: docProfile?.license_document_url || null,
        address: docProfile?.address || profile?.address || null,
        verified_at: docProfile?.verified_at || null,
        created_at: docProfile?.created_at || profile?.created_at || new Date().toISOString(),
      };
    });
    setAllDoctorProfiles(enrichedAllDocs);

    const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const doctorCount = (roles || []).filter((r: any) => r.role === 'doctor').length;
    const { count: scanCount } = await supabase.from("scans").select("*", { count: "exact", head: true });
    const { count: dentalScanCount } = await supabase.from("dental_scans").select("*", { count: "exact", head: true });

    // Count patients: users with 'patient' role OR users with no role (not doctor/admin/moderator)
    const doctorUserIds = (roles || []).filter((r: any) => r.role === 'doctor').map((r: any) => r.user_id);
    const adminModUserIds = (roles || []).filter((r: any) => r.role === 'admin' || r.role === 'moderator').map((r: any) => r.user_id);
    const nonPatientUserIds = new Set([...doctorUserIds, ...adminModUserIds]);
    const patientCount = (enrichedProfiles || []).filter((p: any) => !nonPatientUserIds.has(p.user_id)).length;

     // Revenue only from admin-approved subscriptions (approved_at is set), excluding admin users
     const adminUserIds = (roles || []).filter((r: any) => r.role === 'admin').map((r: any) => r.user_id);
     const { data: revenueSubs } = await supabase
       .from("user_subscriptions")
       .select("*, subscription_plans(price_inr)")
       .eq("status", "active")
       .not("approved_at", "is", null);
     const totalRevenue = (revenueSubs || []).filter((s: any) => !adminUserIds.includes(s.user_id)).reduce((sum: number, s: any) => sum + ((s.subscription_plans as any)?.price_inr || 0), 0);

    // Count subscribed patients (active subs, excluding admins)
    const subscribedPatientCount = (revenueSubs || []).filter((s: any) => !adminUserIds.includes(s.user_id)).length;

    setStats({
      users: userCount || 0,
      doctors: doctorCount || 0,
      patients: patientCount,
      scans: (scanCount || 0) + (dentalScanCount || 0),
      revenue: totalRevenue,
      pendingPatients: pendingPats.length,
      subscribedPatients: subscribedPatientCount,
    });

    // Fetch scan counts per patient
    const { data: allScans } = await supabase.from("scans").select("user_id");
    const { data: allDentalScans } = await supabase.from("dental_scans").select("user_id");
    const scanCounts: Record<string, number> = {};
    (allScans || []).forEach((s: any) => { scanCounts[s.user_id] = (scanCounts[s.user_id] || 0) + 1; });
    (allDentalScans || []).forEach((s: any) => { scanCounts[s.user_id] = (scanCounts[s.user_id] || 0) + 1; });
    setPatientScans(scanCounts);

    // Fetch active & pending subscriptions per patient
    const { data: allSubs } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(name, scan_limit, doctor_consultations)")
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false });
    const subMap: Record<string, any> = {};
    (allSubs || []).forEach((s: any) => { if (!subMap[s.user_id]) subMap[s.user_id] = s; });
    setPatientSubs(subMap);
  };

  const fetchRecordings = async () => {
    const { data } = await supabase
      .from("call_recordings" as any)
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data && data.length > 0) {
      // Enrich with patient/doctor names
      const userIds = [...new Set((data as any[]).flatMap((r: any) => [r.patient_id, r.doctor_id]))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      setRecordings((data as any[]).map((r: any) => ({
        ...r,
        patient_name: profileMap[r.patient_id] || "Patient",
        doctor_name: profileMap[r.doctor_id] || "Doctor",
      })));
    } else {
      setRecordings([]);
    }
  };

  const playRecording = async (recordingUrl: string) => {
    const { data } = await supabase.storage
      .from("call-recordings")
      .createSignedUrl(recordingUrl, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast({ title: "Error", description: "Could not load recording", variant: "destructive" });
    }
  };

  const downloadRecording = async (recordingUrl: string, consultationId: string) => {
    const { data } = await supabase.storage
      .from("call-recordings")
      .createSignedUrl(recordingUrl, 3600);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = `recording_${consultationId}.webm`;
      a.click();
    }
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from("user_subscriptions" as any)
      .select("*, subscription_plans(*)")
      .order("created_at", { ascending: false });
    
    if (data && data.length > 0) {
      const userIds = [...new Set((data as any[]).map((s: any) => s.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      setSubscriptions((data as any[]).map((s: any) => ({
        ...s,
        patient_name: profileMap[s.user_id] || "Patient",
        plan_name: (s as any).subscription_plans?.name || "Unknown",
        plan_price: (s as any).subscription_plans?.price_inr || 0,
      })));
    } else {
      setSubscriptions([]);
    }
  };

  const fetchRatings = async () => {
    const { data: cRatings } = await supabase
      .from("consultation_ratings")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: aRatings } = await supabase
      .from("app_ratings")
      .select("*")
      .order("created_at", { ascending: false });

    const allUserIds = [
      ...new Set([
        ...(cRatings || []).flatMap((r: any) => [r.rated_by, r.rated_user]),
        ...(aRatings || []).map((r: any) => r.user_id),
      ]),
    ];

    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", allUserIds);
      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p.full_name])
      );
      setConsultationRatings(
        (cRatings || []).map((r: any) => ({
          ...r,
          rated_by_name: profileMap[r.rated_by] || "Unknown",
          rated_user_name: profileMap[r.rated_user] || "Unknown",
        }))
      );
      setAppRatings(
        (aRatings || []).map((r: any) => ({
          ...r,
          user_name: profileMap[r.user_id] || "Unknown",
        }))
      );
    } else {
      setConsultationRatings([]);
      setAppRatings([]);
    }
  };

  const handleApproveSub = async (subId: string) => {
    const { error } = await supabase
      .from("user_subscriptions" as any)
      .update({ status: "active", approved_at: new Date().toISOString() } as any)
      .eq("id", subId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Subscription activated!" });
      fetchSubscriptions();
    }
  };

  const handleRejectSub = async (subId: string) => {
    const { error } = await supabase
      .from("user_subscriptions" as any)
      .update({ status: "rejected" } as any)
      .eq("id", subId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "❌ Subscription rejected" });
      fetchSubscriptions();
    }
  };

  const handleViewDoctor = async (doc: any) => {
    setSelectedDoctor(doc);
    setRejectNotes("");
    setLicenseDocUrl(null);

    // Load license document if available
    if (doc.license_document_url) {
      const { data } = await supabase.storage
        .from("license-documents")
        .createSignedUrl(doc.license_document_url, 3600);
      if (data?.signedUrl) {
        setLicenseDocUrl(data.signedUrl);
      }
    }
  };

  const handleRunApiVerification = async (doc: any) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-license", {
        body: {
          licenseNumber: doc.medical_license,
          doctorId: doc.doctor_id,
          doctorProfileId: doc.id,
        },
      });

      if (error) throw error;

      toast({
        title: data.isValid ? "✅ License Format Valid" : "⚠️ License Flagged",
        description: data.notes?.join(". ") || "Verification complete",
        variant: data.isValid ? "default" : "destructive",
      });

      fetchData();
      // Refresh selected doctor
      if (selectedDoctor) {
        const { data: updatedDoc } = await supabase
          .from("doctor_profiles")
          .select("*")
          .eq("id", doc.id)
          .single();
        if (updatedDoc) {
          const profile = allUsers.find((p) => p.user_id === updatedDoc.user_id);
          setSelectedDoctor({ ...updatedDoc, profiles: profile });
        }
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    }
    setVerifying(false);
  };

  const handleVerifyDoctor = async (userId: string, approve: boolean) => {
    if (approve) {
      const { error } = await supabase.from("doctor_profiles").update({
        is_verified: true,
        license_verification_status: 'admin_approved',
        verified_at: new Date().toISOString(),
        verified_by: user?.id,
      }).eq("user_id", userId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "✅ Doctor approved!" });
    } else {
      const { error } = await supabase.from("doctor_profiles").update({
        license_verification_status: 'admin_rejected',
        license_verification_notes: rejectNotes || 'Rejected by admin',
      }).eq("user_id", userId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "❌ Doctor registration rejected." });
    }
    setSelectedDoctor(null);
    fetchData();
  };

  const handleViewPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setRejectNotes("");
    setIdDocUrl(null);

    if (patient.id_document_url) {
      const { data } = await supabase.storage
        .from("id-documents")
        .createSignedUrl(patient.id_document_url, 3600);
      if (data?.signedUrl) {
        setIdDocUrl(data.signedUrl);
      }
    }
  };

  const handleVerifyPatient = async (userId: string, approve: boolean) => {
    const { error } = await supabase.from("profiles").update({
      id_verification_status: approve ? 'verified' : 'rejected',
      id_verification_notes: approve ? 'Approved by admin' : (rejectNotes || 'Rejected by admin'),
    }).eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: approve ? "✅ Patient ID verified!" : "❌ Patient ID rejected." });
    setSelectedPatient(null);
    fetchData();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently remove "${userName}" from the app? This cannot be undone.`)) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({ title: "✅ User removed", description: `${userName} has been permanently deleted.` });
      fetchData();
      fetchSubscriptions();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'api_verified':
        return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/20 text-success">✅ API Verified</span>;
      case 'api_flagged':
        return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">⚠️ API Flagged</span>;
      case 'admin_approved':
        return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/20 text-success">✅ Admin Approved</span>;
      case 'admin_rejected':
        return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">❌ Rejected</span>;
      default:
        return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/20 text-warning">⏳ Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">Admin Panel</span>
        </div>
        <button onClick={handleLogout} className="text-primary-foreground">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 container py-6 space-y-5">
        <h1 className="font-display text-2xl font-bold">Admin Dashboard 🛡️</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { icon: Users, label: "Total Users", value: String(stats.users), color: "text-primary" },
            { icon: Users, label: "Patients", value: String(stats.patients), color: "text-accent-foreground" },
            { icon: CreditCard, label: "Subscribed", value: String(stats.subscribedPatients), color: "text-success" },
            { icon: Stethoscope, label: "Doctors", value: String(stats.doctors), color: "text-secondary" },
            { icon: ScanLine, label: "Total Scans", value: String(stats.scans), color: "text-warning" },
            { icon: DollarSign, label: "Revenue", value: `₹${stats.revenue}`, color: "text-success" },
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
          <TabsList className="w-full grid grid-cols-3 md:grid-cols-9 gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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
                          <div className="mt-1">
                            {getVerificationBadge(doc.license_verification_status)}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs px-2.5" onClick={() => handleViewDoctor(doc)}>
                            <Eye className="h-3 w-3 mr-1" /> Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Patient ID Verifications */}
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Pending Patient ID Verifications ({pendingPatients.length})
                </h3>
                {pendingPatients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending patient verifications.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingPatients.slice(0, 5).map((pat: any) => (
                      <div key={pat.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-sm">{pat.full_name}</p>
                          <p className="text-xs text-muted-foreground">Aadhaar: {pat.aadhaar_number ? `****${pat.aadhaar_number.slice(-4)}` : 'N/A'}</p>
                        </div>
                        <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs px-2.5" onClick={() => handleViewPatient(pat)}>
                          <Eye className="h-3 w-3 mr-1" /> Review
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BarChart3, label: "Analytics", tab: "analytics" },
                { icon: Settings, label: "Settings", tab: "settings" },
              ].map((a) => (
                <Card key={a.label} className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all" onClick={() => setTab(a.tab)}>
                  <CardContent className="p-4 text-center">
                    <a.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-medium text-sm">{a.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="mt-4 space-y-3">
            {allDoctorProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No doctors registered yet.</p>
            ) : (
              allDoctorProfiles.map((doc) => (
                <Card key={doc.id} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-secondary/20 rounded-full p-2.5">
                          <Stethoscope className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{doc.profiles?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">📧 {doc.profiles?.email}</p>
                          {doc.profiles?.phone && <p className="text-xs text-muted-foreground">📱 {doc.profiles.phone}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          doc.is_verified ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                        }`}>
                          {doc.is_verified ? "Verified" : "Pending"}
                        </span>
                        {getVerificationBadge(doc.license_verification_status)}
                      </div>
                    </div>
                    <div className="ml-12 space-y-0.5">
                      <p className="text-xs text-muted-foreground">🏥 {doc.hospital_name}</p>
                      <p className="text-xs text-muted-foreground">🩺 {doc.specialization} • License: {doc.medical_license}</p>
                      <p className="text-xs text-muted-foreground">🆔 Doctor ID: {doc.doctor_id}</p>
                      {doc.address && <p className="text-xs text-muted-foreground">📍 {doc.address}</p>}
                      {doc.profiles?.phone && <p className="text-xs text-muted-foreground">📱 {doc.profiles.phone}</p>}
                      <p className="text-xs text-muted-foreground">📅 Registered: {new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      {doc.verified_at && <p className="text-xs text-success">✅ Verified on: {new Date(doc.verified_at).toLocaleDateString("en-IN")}</p>}
                      {doc.license_document_url && (
                        <p className="text-xs text-success flex items-center gap-1">
                          <FileCheck className="h-3 w-3" /> License document uploaded
                        </p>
                      )}
                    </div>
                    <div className="ml-12 mt-2 flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleViewDoctor(doc)}>
                        <Eye className="h-3 w-3 mr-1" /> Review
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRunApiVerification(doc)} disabled={verifying}>
                        {verifying ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileCheck className="h-3 w-3 mr-1" />}
                        API Verify
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="mt-4 space-y-3">
            {allUsers.filter((u: any) => u.user_roles?.[0]?.role === 'patient' || !u.user_roles?.[0]?.role).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No patients found.</p>
            ) : (
              allUsers
                .filter((u: any) => u.user_roles?.[0]?.role === 'patient' || !u.user_roles?.[0]?.role)
                .map((pat: any) => (
                  <Card key={pat.id} className="shadow-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/20 rounded-full p-2.5">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{pat.full_name}</p>
                         <p className="text-xs text-muted-foreground">📧 {pat.email}</p>
                         {pat.phone && <p className="text-xs text-muted-foreground">📱 {pat.phone} {pat.phone_verified ? '✅' : ''}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {pat.id_verification_status === 'verified' ? (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-success/20 text-success">✅ ID Verified</span>
                          ) : pat.id_verification_status === 'rejected' ? (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-destructive/20 text-destructive">❌ Rejected</span>
                          ) : pat.id_document_url ? (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-warning/20 text-warning">⏳ Pending</span>
                          ) : (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">No ID</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-12 space-y-0.5">
                        {pat.age && <p className="text-xs text-muted-foreground">🎂 Age: {pat.age} {pat.sex ? `• ⚧ ${pat.sex}` : ''}</p>}
                        {pat.aadhaar_number && <p className="text-xs text-muted-foreground">🪪 Aadhaar: ****{pat.aadhaar_number.slice(-4)}</p>}
                        {pat.address && <p className="text-xs text-muted-foreground">📍 {pat.address}</p>}
                        <p className="text-xs text-muted-foreground">📅 Joined: {new Date(pat.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                        <p className="text-xs text-muted-foreground">🔬 Total Scans: {patientScans[pat.user_id] || 0}</p>
                        {patientSubs[pat.user_id] ? (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              patientSubs[pat.user_id].status === 'active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                            }`}>
                              {patientSubs[pat.user_id].status === 'active' ? '✅' : '⏳'} {patientSubs[pat.user_id].subscription_plans?.name} Plan
                              {patientSubs[pat.user_id].status === 'pending' ? ' (Pending)' : ''}
                            </span>
                            {patientSubs[pat.user_id].status === 'active' && (
                              <span className="text-xs text-muted-foreground">
                                Scans: {patientSubs[pat.user_id].scans_used}/{patientSubs[pat.user_id].subscription_plans?.scan_limit} • 
                                Consults: {patientSubs[pat.user_id].consultations_used}/{patientSubs[pat.user_id].subscription_plans?.doctor_consultations}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground mt-1 inline-block">No Subscription</span>
                        )}
                      </div>
                      {pat.id_document_url && (
                        <div className="ml-12 mt-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleViewPatient(pat)}>
                            <Eye className="h-3 w-3 mr-1" /> Review ID
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-3">
            {allUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>
            ) : (
              allUsers.map((u) => (
                <Card key={u.id} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{u.full_name}</p>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        u.user_roles?.[0]?.role === "admin"
                          ? "bg-destructive/20 text-destructive"
                          : u.user_roles?.[0]?.role === "doctor"
                          ? "bg-secondary/20 text-secondary"
                          : "bg-primary/20 text-primary"
                      }`}>
                        {u.user_roles?.[0]?.role || "patient"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">📧 {u.email}</p>
                    {u.phone && <p className="text-xs text-muted-foreground">📱 {u.phone}</p>}
                    <div className="flex gap-4 mt-1.5">
                      {u.age && <p className="text-xs text-muted-foreground">🎂 Age: {u.age}</p>}
                      {u.sex && <p className="text-xs text-muted-foreground">⚧ {u.sex}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">📅 Joined: {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    {u.user_roles?.[0]?.role !== "admin" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="mt-2 h-7 text-xs rounded-lg"
                        onClick={() => handleDeleteUser(u.user_id, u.full_name)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Remove User
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-4 space-y-4">
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning" /> Consultation Ratings ({consultationRatings.length})
                </h3>
                {consultationRatings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No consultation ratings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {consultationRatings.map((r: any) => (
                      <div key={r.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="text-sm font-medium">{r.rated_by_name} → {r.rated_user_name}</p>
                            <p className="text-xs text-muted-foreground">
                              📅 {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`h-3.5 w-3.5 ${r.rating >= star ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{r.rating}/5</span>
                          </div>
                        </div>
                        {r.review && <p className="text-xs text-muted-foreground italic ml-1">"{r.review}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" /> App Ratings ({appRatings.length})
                </h3>
                {appRatings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No app ratings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {appRatings.map((r: any) => (
                      <div key={r.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="text-sm font-medium">{r.user_name}</p>
                            <p className="text-xs text-muted-foreground">
                              📅 {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`h-3.5 w-3.5 ${r.rating >= star ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{r.rating}/5</span>
                          </div>
                        </div>
                        {r.review && <p className="text-xs text-muted-foreground italic ml-1">"{r.review}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recordings Tab */}
          <TabsContent value="recordings" className="mt-4 space-y-3">
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Video className="h-4 w-4 text-destructive" /> Call Recordings ({recordings.length})
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  All video consultations are automatically recorded and saved here to prevent misuse.
                </p>
              </CardContent>
            </Card>
            {recordings.length === 0 ? (
              <Card className="shadow-card border-border">
                <CardContent className="p-5 text-center text-sm text-muted-foreground">
                  No call recordings yet. Recordings will appear here after video consultations.
                </CardContent>
              </Card>
            ) : (
              recordings.map((rec: any) => (
                <Card key={rec.id} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">
                          🧑‍⚕️ {rec.doctor_name} ↔ 🧑 {rec.patient_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          📅 {new Date(rec.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <div className="flex gap-3 mt-1">
                          {rec.duration_seconds && (
                            <p className="text-xs text-muted-foreground">
                              ⏱ {Math.floor(rec.duration_seconds / 60)}m {rec.duration_seconds % 60}s
                            </p>
                          )}
                          {rec.file_size_bytes && (
                            <p className="text-xs text-muted-foreground">
                              📦 {(rec.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => playRecording(rec.recording_url)}>
                          <Play className="h-3.5 w-3.5 mr-1" /> Play
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => downloadRecording(rec.recording_url, rec.consultation_id)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4 space-y-3">
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" /> UPI Subscription Payments
                </h3>
                <p className="text-xs text-muted-foreground">Review and approve/reject subscription payments from patients.</p>
              </CardContent>
            </Card>
            {subscriptions.length === 0 ? (
              <Card className="shadow-card border-border">
                <CardContent className="p-5 text-center text-sm text-muted-foreground">
                  No subscription payments yet.
                </CardContent>
              </Card>
            ) : (
              subscriptions.map((sub: any) => (
                <Card key={sub.id} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{sub.patient_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.plan_name} Plan • ₹{sub.plan_price}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          📅 {new Date(sub.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        {sub.upi_transaction_id && (
                          <p className="text-xs font-mono mt-1">UPI Txn: {sub.upi_transaction_id}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          sub.status === "active" ? "bg-success/20 text-success" :
                          sub.status === "rejected" ? "bg-destructive/20 text-destructive" :
                          "bg-warning/20 text-warning"
                        }`}>
                          {sub.status === "active" ? "✅ Active" : sub.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                        </span>
                      </div>
                    </div>
                    {sub.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="flex-1 rounded-lg text-xs" onClick={() => handleApproveSub(sub.id)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs" onClick={() => handleRejectSub(sub.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Platform Analytics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/10 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.users}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Users</p>
                  </div>
                  <div className="bg-secondary/10 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-secondary">{stats.doctors}</p>
                    <p className="text-xs text-muted-foreground mt-1">Doctors</p>
                  </div>
                  <div className="bg-success/10 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-success">{stats.patients}</p>
                    <p className="text-xs text-muted-foreground mt-1">Patients</p>
                  </div>
                  <div className="bg-warning/10 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-warning">{stats.scans}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Scans</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" /> Revenue Overview
                </h3>
                <div className="bg-success/10 rounded-xl p-4 text-center mb-3">
                  <p className="text-3xl font-bold text-success">₹{stats.revenue.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Revenue (Approved Subscriptions)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold">{stats.subscribedPatients}</p>
                    <p className="text-xs text-muted-foreground">Active Subscribers</p>
                  </div>
                  <div className="border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold">{subscriptions.filter((s: any) => s.status === "pending").length}</p>
                    <p className="text-xs text-muted-foreground">Pending Payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning" /> Ratings Summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold">{consultationRatings.length}</p>
                    <p className="text-xs text-muted-foreground">Consultation Ratings</p>
                    {consultationRatings.length > 0 && (
                      <p className="text-xs text-warning mt-1">
                        Avg: {(consultationRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / consultationRatings.length).toFixed(1)} ⭐
                      </p>
                    )}
                  </div>
                  <div className="border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold">{appRatings.length}</p>
                    <p className="text-xs text-muted-foreground">App Ratings</p>
                    {appRatings.length > 0 && (
                      <p className="text-xs text-warning mt-1">
                        Avg: {(appRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / appRatings.length).toFixed(1)} ⭐
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Video className="h-4 w-4 text-destructive" /> Consultation Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold">{recordings.length}</p>
                    <p className="text-xs text-muted-foreground">Call Recordings</p>
                  </div>
                  <div className="border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold">{stats.pendingPatients}</p>
                    <p className="text-xs text-muted-foreground">Pending ID Verifications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Admin Account
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium">{user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-destructive/20 text-destructive">Admin</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">User ID</span>
                    <span className="text-xs font-mono text-muted-foreground">{user?.id?.slice(0, 8)}...</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-secondary" /> Platform Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-sm text-muted-foreground">Total Users</span>
                    <span className="text-sm font-medium">{stats.users}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-sm text-muted-foreground">Verified Doctors</span>
                    <span className="text-sm font-medium">{allDoctorProfiles.filter((d: any) => d.is_verified).length}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-sm text-muted-foreground">Pending Doctors</span>
                    <span className="text-sm font-medium">{pendingDoctors.length}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-sm text-muted-foreground">Pending Patient IDs</span>
                    <span className="text-sm font-medium">{pendingPatients.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Subscribers</span>
                    <span className="text-sm font-medium">{stats.subscribedPatients}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-warning" /> Actions
                </h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start text-sm" onClick={() => setTab("payments")}>
                    <CreditCard className="h-4 w-4 mr-2" /> Manage Payments
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-sm" onClick={() => setTab("doctors")}>
                    <Stethoscope className="h-4 w-4 mr-2" /> Manage Doctors
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-sm" onClick={() => setTab("patients")}>
                    <Users className="h-4 w-4 mr-2" /> Manage Patients
                  </Button>
                  <Button variant="destructive" className="w-full justify-start text-sm mt-3" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Doctor Review Dialog */}
      <Dialog open={!!selectedDoctor} onOpenChange={(open) => !open && setSelectedDoctor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Doctor Verification Review
            </DialogTitle>
          </DialogHeader>

          {selectedDoctor && (
            <div className="space-y-4">
              {/* Doctor Info */}
              <div className="bg-accent/30 rounded-xl p-4 space-y-2">
                <h4 className="font-semibold">{selectedDoctor.profiles?.full_name}</h4>
                <p className="text-sm text-muted-foreground">📧 {selectedDoctor.profiles?.email}</p>
                {selectedDoctor.profiles?.phone && (
                  <p className="text-sm text-muted-foreground">📱 {selectedDoctor.profiles.phone} {selectedDoctor.profiles.phone_verified ? '✅' : '❌'}</p>
                )}
                <p className="text-sm text-muted-foreground">🏥 {selectedDoctor.hospital_name}</p>
                <p className="text-sm text-muted-foreground">🩺 {selectedDoctor.specialization}</p>
                <p className="text-sm text-muted-foreground">📋 License: <span className="font-mono font-semibold">{selectedDoctor.medical_license}</span></p>
                <p className="text-sm text-muted-foreground">🆔 Doctor ID: <span className="font-mono font-semibold">{selectedDoctor.doctor_id}</span></p>
              </div>

              {/* API Verification Status */}
              <div className="border border-border rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" /> API Verification
                </h4>
                <div className="mb-2">{getVerificationBadge(selectedDoctor.license_verification_status)}</div>
                {selectedDoctor.license_verification_notes && (
                  <div className="bg-muted rounded-lg p-2.5 mt-2">
                    <p className="text-xs text-muted-foreground">{selectedDoctor.license_verification_notes}</p>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs"
                  onClick={() => handleRunApiVerification(selectedDoctor)}
                  disabled={verifying}
                >
                  {verifying ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileCheck className="h-3 w-3 mr-1" />}
                  Run API Verification
                </Button>
              </div>

              {/* License Document */}
              <div className="border border-border rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  📄 License Document
                </h4>
                {licenseDocUrl ? (
                  <div className="space-y-2">
                    <img src={licenseDocUrl} alt="License Certificate" className="w-full rounded-lg border border-border" />
                    <a href={licenseDocUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                      View full document ↗
                    </a>
                  </div>
                ) : selectedDoctor.license_document_url ? (
                  <p className="text-xs text-muted-foreground">Loading document...</p>
                ) : (
                  <div className="bg-warning/10 rounded-lg p-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-xs text-warning">No license document uploaded</p>
                  </div>
                )}
              </div>

              {/* Rejection Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Notes (optional)</label>
                <Textarea
                  placeholder="Reason for rejection..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleVerifyDoctor(selectedDoctor.user_id, true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve Doctor
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleVerifyDoctor(selectedDoctor.user_id, false)}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Patient ID Review Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Patient ID Verification
            </DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-4">
              <div className="bg-accent/30 rounded-xl p-4 space-y-2">
                <h4 className="font-semibold">{selectedPatient.full_name}</h4>
                <p className="text-sm text-muted-foreground">📧 {selectedPatient.email}</p>
                {selectedPatient.phone && (
                  <p className="text-sm text-muted-foreground">📱 {selectedPatient.phone} {selectedPatient.phone_verified ? '✅' : '❌'}</p>
                )}
                {selectedPatient.age && <p className="text-sm text-muted-foreground">🎂 Age: {selectedPatient.age}</p>}
                {selectedPatient.aadhaar_number && (
                  <p className="text-sm text-muted-foreground">🪪 Aadhaar: <span className="font-mono font-semibold">{selectedPatient.aadhaar_number}</span></p>
                )}
              </div>

              <div className="border border-border rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">📄 ID Document</h4>
                {idDocUrl ? (
                  <div className="space-y-2">
                    <img src={idDocUrl} alt="ID Document" className="w-full rounded-lg border border-border" />
                    <a href={idDocUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                      View full document ↗
                    </a>
                  </div>
                ) : selectedPatient.id_document_url ? (
                  <p className="text-xs text-muted-foreground">Loading document...</p>
                ) : (
                  <div className="bg-warning/10 rounded-lg p-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-xs text-warning">No ID document uploaded</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Notes (optional)</label>
                <Textarea
                  placeholder="Reason for rejection..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleVerifyPatient(selectedPatient.user_id, true)}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Verify Patient
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleVerifyPatient(selectedPatient.user_id, false)}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
