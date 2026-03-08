import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Users, Stethoscope, ScanLine, DollarSign, CheckCircle, XCircle, BarChart3, Shield, Settings, FileCheck, AlertTriangle, Eye, Loader2, CreditCard, Video, Play, Download } from "lucide-react";
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
  const [stats, setStats] = useState({ users: 0, doctors: 0, scans: 0, pendingPatients: 0 });
  const [recordings, setRecordings] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [licenseDocUrl, setLicenseDocUrl] = useState<string | null>(null);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchRecordings();
  }, []);

  const fetchData = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("created_at", { ascending: false });
    setAllUsers(profiles || []);

    // Pending patients with Aadhaar verification
    const pendingPats = (profiles || []).filter(
      (p: any) => p.id_document_url && p.id_verification_status === 'pending'
    );
    setPendingPatients(pendingPats);

    const { data: doctors } = await supabase
      .from("doctor_profiles")
      .select("*")
      .eq("is_verified", false);
    
    const enrichedDoctors = (doctors || []).map((doc) => {
      const profile = (profiles || []).find((p: any) => p.user_id === doc.user_id);
      return { ...doc, profiles: profile };
    });
    setPendingDoctors(enrichedDoctors);

    const { data: allDocs } = await supabase.from("doctor_profiles").select("*");
    const enrichedAllDocs = (allDocs || []).map((doc) => {
      const profile = (profiles || []).find((p: any) => p.user_id === doc.user_id);
      return { ...doc, profiles: profile };
    });
    setAllDoctorProfiles(enrichedAllDocs);

    const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: doctorCount } = await supabase.from("doctor_profiles").select("*", { count: "exact", head: true });
    const { count: scanCount } = await supabase.from("scans").select("*", { count: "exact", head: true });
    setStats({ users: userCount || 0, doctors: doctorCount || 0, scans: scanCount || 0, pendingPatients: pendingPats.length });
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
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
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
                        {pat.aadhaar_number && <p className="text-xs text-muted-foreground">🪪 Aadhaar: ****{pat.aadhaar_number.slice(-4)}</p>}
                        {pat.age && <p className="text-xs text-muted-foreground">🎂 Age: {pat.age}</p>}
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
                  </CardContent>
                </Card>
              ))
            )}
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
