import { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Eye, EyeOff, Upload, FileCheck, Phone, Mail, Loader2, HeartPulse } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const [medicalConditions, setMedicalConditions] = useState<Record<string, boolean>>({});



  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const roleTitle = t(`role.${role || "patient"}`);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'id') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
        return;
      }
      if (type === 'license') {
        setLicenseFile(file);
        setLicensePreview(URL.createObjectURL(file));
      } else {
        setIdFile(file);
        setIdPreview(URL.createObjectURL(file));
      }
    }
  };

  const isValidAadhaar = (num: string) => /^\d{12}$/.test(num.replace(/\s/g, ''));




  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);




    // For doctors, require license document
    if (role === "doctor" && !licenseFile) {
      toast({ title: "License document required", description: "Please upload your medical license certificate", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Validate Aadhaar for patients
    if (role === "patient" && form.aadhaar && !isValidAadhaar(form.aadhaar)) {
      toast({ title: "Invalid Aadhaar", description: "Aadhaar number must be 12 digits", variant: "destructive" });
      setLoading(false);
      return;
    }

    const result = await signUp(
      form.email || "",
      form.password || "",
      {
        full_name: form.name,
        age: form.age,
        sex: form.sex,
        license: form.license,
        doctorId: form.doctorId,
        specialization: form.specialization,
        hospital: form.hospital,
        aadhaar: form.aadhaar,
        phone: form.phone?.replace(/[\s-]/g, ""),
        address: form.address,
      },
      role || "patient"
    );

    if (result.error) {
      setLoading(false);
      toast({ title: "Registration failed", description: result.error.message, variant: "destructive" });
      return;
    }

    const signUpData = (result as any).data;

    // Upload license document for doctors
    if (role === "doctor" && licenseFile && signUpData?.user) {
      try {
        const fileExt = licenseFile.name.split('.').pop();
        const filePath = `${signUpData.user.id}/license.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("license-documents")
          .upload(filePath, licenseFile, { upsert: true });

        if (uploadError) {
          console.error("License upload error:", uploadError);
          toast({ title: "License uploaded partially", description: "Registration successful but document upload failed.", variant: "destructive" });
        } else {
          setTimeout(async () => {
            await supabase.from("doctor_profiles").update({
              license_document_url: filePath,
            }).eq("user_id", signUpData.user.id);

            await supabase.functions.invoke("verify-license", {
              body: {
                licenseNumber: form.license,
                doctorId: form.doctorId,
                specialization: form.specialization,
              },
            });
          }, 2000);
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    // Upload Aadhaar document for patients
    if (role === "patient" && idFile && signUpData?.user) {
      try {
        const fileExt = idFile.name.split('.').pop();
        const filePath = `${signUpData.user.id}/aadhaar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("id-documents")
          .upload(filePath, idFile, { upsert: true });

        if (!uploadError) {
          setTimeout(async () => {
            await supabase.from("profiles").update({
              aadhaar_number: form.aadhaar?.replace(/\s/g, ''),
              id_document_url: filePath,
              id_verification_status: 'pending',
            }).eq("user_id", signUpData.user.id);
          }, 2000);
        }
      } catch (err) {
        console.error("ID upload error:", err);
      }
    }

    // Update phone in profile
    if (signUpData?.user && form.phone) {
      setTimeout(async () => {
        await supabase.from("profiles").update({
          phone: form.phone.replace(/[\s-]/g, ""),
          phone_verified: true,
        }).eq("user_id", signUpData.user.id);
      }, 2000);
    }

    // Save medical history for patients
    if (role === "patient" && signUpData?.user) {
      const hasAnyCondition = Object.values(medicalConditions).some(v => v);
      if (hasAnyCondition || form.blood_group || form.medications || form.other_conditions) {
        setTimeout(async () => {
          await supabase.from("medical_history").insert({
            user_id: signUpData.user.id,
            has_diabetes: medicalConditions.diabetes || false,
            has_hypertension: medicalConditions.hypertension || false,
            has_heart_disease: medicalConditions.heart_disease || false,
            has_asthma: medicalConditions.asthma || false,
            has_thyroid: medicalConditions.thyroid || false,
            has_allergies: medicalConditions.allergies || false,
            has_epilepsy: medicalConditions.epilepsy || false,
            has_kidney_disease: medicalConditions.kidney_disease || false,
            blood_group: form.blood_group || null,
            current_medications: form.medications || null,
            other_conditions: form.other_conditions || null,
          });
        }, 2500);
      }
    }

    setLoading(false);
    toast({ title: "Account created! 📧", description: "Please check your email and click the verification link before logging in." });
    navigate(`/login/${role}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/login/${role}`)} className="text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
            <span className="font-display font-bold text-primary-foreground">{t("app.name")}</span>
          </div>
        </div>
        <LanguageToggle variant="header" />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elevated border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl">{roleTitle} {t("register.title")}</CardTitle>
            <CardDescription>
              {role === "doctor" ? t("register.submitApproval") : role === "admin" ? t("register.adminRestricted") : t("register.createAccount")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("register.fullName")}</Label>
                <Input placeholder="John Doe" onChange={(e) => update("name", e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {t("login.email")}
                </Label>
                <Input type="email" placeholder="you@example.com" onChange={(e) => update("email", e.target.value)} required />
              </div>


              <div className="space-y-1.5">
                <Label>{t("login.password")}</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pr-10" onChange={(e) => update("password", e.target.value)} required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Mobile Number
                </Label>
                <Input
                  placeholder="+91XXXXXXXXXX"
                  onChange={(e) => update("phone", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Optional - for contact purposes</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("register.age")}</Label>
                  <Input type="number" placeholder="25" onChange={(e) => update("age", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("register.sex")}</Label>
                  <Select onValueChange={(v) => update("sex", v)}>
                    <SelectTrigger><SelectValue placeholder={t("register.select")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("register.male")}</SelectItem>
                      <SelectItem value="female">{t("register.female")}</SelectItem>
                      <SelectItem value="other">{t("register.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label>{t("register.address")}</Label>
                <Input placeholder={t("register.addressPlaceholder")} onChange={(e) => update("address", e.target.value)} required />
              </div>

              {role === "doctor" && (
                <>
                  <div className="space-y-1.5">
                    <Label>{t("register.specialization")}</Label>
                    <Select onValueChange={(v) => update("specialization", v)}>
                      <SelectTrigger><SelectValue placeholder={t("register.select")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dermatologist">{t("register.dermatologist")}</SelectItem>
                        <SelectItem value="trichologist">{t("register.trichologist")}</SelectItem>
                        <SelectItem value="ophthalmologist">{t("register.ophthalmologist")}</SelectItem>
                        <SelectItem value="general">{t("register.general")}</SelectItem>
                        <SelectItem value="dentist">{t("register.dentist")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("register.license")}</Label>
                    <Input placeholder={form.specialization === "dentist" ? "DCI-12345 / TN-D-67890 / SDC-12345" : "TN-12345 / NMC-67890"} onChange={(e) => update("license", e.target.value)} required />
                    <p className="text-xs text-muted-foreground">
                      {form.specialization === "dentist" 
                        ? "Dental formats: DCI-XXXXX, SDC-XXXXX, State-D-Number (e.g., TN-D-12345)" 
                        : "Medical formats: State-Number (e.g., TN-12345), NMC-XXXXX, MCI-XXXXX"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("register.doctorId")}</Label>
                    <Input placeholder="DOC-001" onChange={(e) => update("doctorId", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("register.hospital")}</Label>
                    <Input placeholder="City Medical Center" onChange={(e) => update("hospital", e.target.value)} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      License Certificate Upload *
                    </Label>
                    {licensePreview ? (
                      <div className="relative border border-border rounded-xl overflow-hidden">
                        <img src={licensePreview} alt="License preview" className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => { setLicenseFile(null); setLicensePreview(null); }}
                          className="absolute top-2 right-2 bg-card/80 rounded-full p-1 text-xs"
                        >
                          ✕
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-success/90 text-success-foreground text-xs p-1.5 text-center font-medium">
                          ✅ {licenseFile?.name}
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-all"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Upload License Certificate</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG or PDF (max 5MB)</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'license')}
                    />
                  </div>
                </>
              )}

              {role === "patient" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Aadhaar Number</Label>
                    <Input 
                      placeholder="1234 5678 9012" 
                      onChange={(e) => update("aadhaar", e.target.value)} 
                      maxLength={14}
                    />
                    <p className="text-xs text-muted-foreground">12-digit Aadhaar number (optional but recommended)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Aadhaar / ID Card Upload
                    </Label>
                    {idPreview ? (
                      <div className="relative border border-border rounded-xl overflow-hidden">
                        <img src={idPreview} alt="ID preview" className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => { setIdFile(null); setIdPreview(null); }}
                          className="absolute top-2 right-2 bg-card/80 rounded-full p-1 text-xs"
                        >
                          ✕
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-success/90 text-success-foreground text-xs p-1.5 text-center font-medium">
                          ✅ {idFile?.name}
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => idFileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-all"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Upload Aadhaar / ID Card</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG or PDF (max 5MB)</p>
                      </div>
                    )}
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'id')}
                    />
                  </div>

                  {/* Basic Medical History */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <HeartPulse className="h-4 w-4" /> Medical History (optional)
                    </Label>
                    <p className="text-xs text-muted-foreground">Select any existing conditions for better care</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "diabetes", label: "🩸 Diabetes" },
                        { key: "hypertension", label: "💓 High BP" },
                        { key: "heart_disease", label: "❤️ Heart Disease" },
                        { key: "asthma", label: "🫁 Asthma" },
                        { key: "thyroid", label: "🦋 Thyroid" },
                        { key: "allergies", label: "🤧 Allergies" },
                        { key: "epilepsy", label: "⚡ Epilepsy" },
                        { key: "kidney_disease", label: "🫘 Kidney Disease" },
                      ].map((condition) => (
                        <label key={condition.key} className="flex items-center gap-2 bg-accent/30 rounded-lg p-2 cursor-pointer hover:bg-accent/50 transition-colors">
                          <Checkbox
                            checked={medicalConditions[condition.key] || false}
                            onCheckedChange={(checked) => setMedicalConditions(prev => ({ ...prev, [condition.key]: !!checked }))}
                          />
                          <span className="text-xs font-medium">{condition.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Blood Group</Label>
                      <Select onValueChange={(v) => update("blood_group", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select blood group" /></SelectTrigger>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Current Medications (if any)</Label>
                      <Input placeholder="e.g., Metformin, Amlodipine..." onChange={(e) => update("medications", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Other Medical Conditions</Label>
                      <Input placeholder="e.g., PCOD, Arthritis, Migraine..." onChange={(e) => update("other_conditions", e.target.value)} className="h-8 text-xs" />
                      <p className="text-xs text-muted-foreground">Type any conditions not listed above</p>
                    </div>
                  </div>
                </>
              )}

              {role === "admin" && (
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
                  <p className="text-xs text-warning-foreground">{t("register.adminWarning")}</p>
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? t("register.processing") : role === "doctor" ? t("register.submitForApproval") : t("register.createAccountBtn")}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t("register.haveAccount")}{" "}
              <Link to={`/login/${role}`} className="text-primary font-medium hover:underline">{t("register.signIn")}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
