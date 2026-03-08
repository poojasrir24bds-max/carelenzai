import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Bell, Calendar, Clock, Users, CheckCircle, XCircle, FileText, Stethoscope, MessageSquare, HeartPulse, Video, CreditCard } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MedicalHistoryForm from "@/components/MedicalHistoryForm";

const sevColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("consultations");
  const [consultations, setConsultations] = useState<any[]>([]);
  const [doubts, setDoubts] = useState<any[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [patientHistory, setPatientHistory] = useState<Record<string, any[]>>({});
  const [doctorSub, setDoctorSub] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDoctorProfile();
      fetchConsultations();
      fetchDoubts();
    }
  }, [user]);

  const fetchDoctorProfile = async () => {
    const { data } = await supabase.from("doctor_profiles").select("*").eq("user_id", user!.id).maybeSingle();
    setDoctorProfile(data);
  };

  const fetchConsultations = async () => {
    const { data } = await supabase
      .from("consultations")
      .select("*, scans(*)")
      .eq("doctor_id", user!.id)
      .order("created_at", { ascending: false });
    // Fetch patient names separately
    if (data && data.length > 0) {
      const patientIds = [...new Set(data.map(c => c.patient_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone, phone_verified").in("user_id", patientIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      setConsultations(data.map(c => ({ ...c, patient_name: profileMap[c.patient_id]?.full_name || "Patient", patient_phone: profileMap[c.patient_id]?.phone })));
    } else {
      setConsultations([]);
    }
  };

  const fetchDoubts = async () => {
    const { data } = await supabase
      .from("patient_doubts")
      .select("*")
      .eq("doctor_id", user!.id)
      .order("created_at", { ascending: false });

    // Also fetch unassigned doubts
    const { data: unassigned } = await supabase
      .from("patient_doubts")
      .select("*")
      .is("doctor_id", null)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const allDoubts = [...(unassigned || []), ...(data || [])];
    
    // Fetch patient names
    if (allDoubts.length > 0) {
      const patientIds = [...new Set(allDoubts.map(d => d.patient_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      setDoubts(allDoubts.map(d => ({ ...d, patient_name: profileMap[d.patient_id] || "Patient" })));
    } else {
      setDoubts([]);
    }
  };

  const fetchPatientHistory = async (patientId: string) => {
    if (patientHistory[patientId]) return;
    const { data } = await supabase
      .from("scans")
      .select("*")
      .eq("user_id", patientId)
      .order("created_at", { ascending: false });
    setPatientHistory((prev) => ({ ...prev, [patientId]: data || [] }));
  };

  const handleConsultation = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("consultations").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Consultation accepted" : "Consultation declined" });
      fetchConsultations();
    }
  };

  const handleAnswerDoubt = async (doubtId: string) => {
    const answer = answerText[doubtId];
    if (!answer?.trim()) return;
    const { error } = await supabase.from("patient_doubts").update({
      answer: answer.trim(),
      status: "answered",
      doctor_id: user!.id,
    }).eq("id", doubtId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Answer submitted!" });
      setAnswerText((prev) => ({ ...prev, [doubtId]: "" }));
      fetchDoubts();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (doctorProfile && !doctorProfile.is_verified) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md shadow-elevated border-border">
          <CardContent className="p-6 text-center">
            <div className="bg-warning/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Verification Pending</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your doctor account is awaiting admin verification. You'll be notified once approved.
            </p>
            <Button variant="outline" onClick={handleLogout}>Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">Doctor Portal</span>
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

      <div className="flex-1 container py-6 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold">{profile?.full_name || "Doctor"} 👩‍⚕️</h1>
          <p className="text-muted-foreground text-sm">
            {doctorProfile?.specialization} • {doctorProfile?.hospital_name}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Patients", value: String(consultations.length) },
            { icon: Calendar, label: "Pending", value: String(consultations.filter((c) => c.status === "pending").length) },
            { icon: MessageSquare, label: "Doubts", value: String(doubts.length) },
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
            <TabsTrigger value="doubts" className="flex-1">Patient Doubts</TabsTrigger>
            <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="space-y-3 mt-4">
            {consultations.length === 0 ? (
              <Card className="shadow-card border-border">
                <CardContent className="p-5 text-center text-sm text-muted-foreground">
                  No consultation requests yet.
                </CardContent>
              </Card>
            ) : (
              consultations.map((c) => (
                <Card key={c.id} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Stethoscope className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{c.patient_name || "Patient"}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.scans?.area && `${c.scans.area} Scan • `}
                            {new Date(c.created_at).toLocaleDateString()}
                          </p>
                          {c.patient_phone && (
                            <p className="text-xs text-muted-foreground">📱 {c.patient_phone}</p>
                          )}
                        </div>
                      </div>
                      {c.scans?.severity && (
                        <span className={`${sevColors[c.scans.severity]} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
                          {c.scans.severity}
                        </span>
                      )}
                    </div>

                    {/* Patient History */}
                    {c.status === "accepted" && (
                      <div className="mt-2 space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs mb-2"
                          onClick={() => fetchPatientHistory(c.patient_id)}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" /> View Scan History
                        </Button>
                        {patientHistory[c.patient_id] && (
                          <div className="bg-accent/30 rounded-lg p-3 mt-2">
                            {patientHistory[c.patient_id].length === 0 ? (
                              <p className="text-xs text-muted-foreground">No previous records found.</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-medium">Scan History Timeline:</p>
                                {patientHistory[c.patient_id].map((scan) => (
                                  <div key={scan.id} className="flex items-center gap-2 text-xs">
                                    <div className={`w-2 h-2 rounded-full ${
                                      scan.severity === "high" ? "bg-destructive" :
                                      scan.severity === "medium" ? "bg-warning" : "bg-success"
                                    }`} />
                                    <span className="text-muted-foreground">
                                      {new Date(scan.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="capitalize">{scan.area}</span>
                                    <span className="text-muted-foreground">- {scan.condition}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Patient Medical History (conditions) */}
                        <MedicalHistoryForm userId={c.patient_id} readOnly />
                      </div>
                    )}

                    {c.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1 rounded-lg text-xs" onClick={() => handleConsultation(c.id, "accepted")}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs" onClick={() => handleConsultation(c.id, "rejected")}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    )}
                    {c.status === "accepted" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 rounded-lg text-xs"
                          onClick={() => navigate("/video-call", { state: { roomId: c.room_id, consultationId: c.id, role: "doctor" } })}
                        >
                          <Video className="h-3.5 w-3.5 mr-1" /> Join Video Call
                        </Button>
                      </div>
                    )}
                    {c.status === "completed" && (
                      <p className="text-xs text-success mt-2 font-medium">✓ Consultation completed</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="doubts" className="space-y-3 mt-4">
            {doubts.length === 0 ? (
              <Card className="shadow-card border-border">
                <CardContent className="p-5 text-center text-sm text-muted-foreground">
                  No patient questions at the moment.
                </CardContent>
              </Card>
            ) : (
              doubts.map((d) => (
                <Card key={d.id} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm">{d.patient_name || "Patient"}</p>
                    <p className="text-sm mt-1 bg-accent/30 rounded-lg p-2">{d.question}</p>
                    {d.ai_answer && (
                      <div className="bg-primary/5 rounded-lg p-2 mt-1">
                        <p className="text-xs text-muted-foreground font-medium">🤖 AI Answer:</p>
                        <p className="text-xs mt-0.5">{d.ai_answer}</p>
                      </div>
                    )}
                    {d.status === "answered" ? (
                      <p className="text-xs text-success mt-2">✓ Answered: {d.answer}</p>
                    ) : (
                      <div className="mt-2">
                        <Textarea
                          placeholder="Type your answer..."
                          value={answerText[d.id] || ""}
                          onChange={(e) => setAnswerText((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          rows={2}
                          className="mb-2"
                        />
                        <Button size="sm" className="rounded-lg text-xs" onClick={() => handleAnswerDoubt(d.id)}>
                          Submit Answer
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <Card className="shadow-card border-border">
              <CardContent className="p-5 space-y-3">
                {[
                  ["Name", profile?.full_name || "-"],
                  ["Mobile", profile?.phone ? `${profile.phone} ${profile.phone_verified ? '✅' : '❌ Not verified'}` : "-"],
                  ["Specialization", doctorProfile?.specialization || "-"],
                  ["License", doctorProfile?.medical_license || "-"],
                  ["Hospital", doctorProfile?.hospital_name || "-"],
                  ["Status", doctorProfile?.is_verified ? "✅ Verified" : "⏳ Pending"],
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
