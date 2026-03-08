import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";

const Register = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const roleTitle = t(`role.${role || "patient"}`);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(
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
      },
      role || "patient"
    );

    setLoading(false);

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Account created!" });
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
            <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
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
                <Label>{t("login.email")}</Label>
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

              {role === "doctor" && (
                <>
                  <div className="space-y-1.5">
                    <Label>{t("register.license")}</Label>
                    <Input placeholder="ML-12345" onChange={(e) => update("license", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("register.doctorId")}</Label>
                    <Input placeholder="DOC-001" onChange={(e) => update("doctorId", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("register.specialization")}</Label>
                    <Select onValueChange={(v) => update("specialization", v)}>
                      <SelectTrigger><SelectValue placeholder={t("register.select")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dermatologist">{t("register.dermatologist")}</SelectItem>
                        <SelectItem value="trichologist">{t("register.trichologist")}</SelectItem>
                        <SelectItem value="ophthalmologist">{t("register.ophthalmologist")}</SelectItem>
                        <SelectItem value="general">{t("register.general")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("register.hospital")}</Label>
                    <Input placeholder="City Medical Center" onChange={(e) => update("hospital", e.target.value)} required />
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
