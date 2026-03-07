import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "doctor") {
      toast({ title: "Registration submitted!", description: "Your account is pending admin approval." });
    } else {
      toast({ title: "Account created!", description: "Welcome to HealthScan AI!" });
    }
    navigate(`/login/${role}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/login/${role}`)} className="text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">HealthScan AI</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elevated border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl">{role === "doctor" ? "Doctor" : role === "admin" ? "Admin" : "Patient"} Registration</CardTitle>
            <CardDescription>{role === "doctor" ? "Submit for admin approval" : "Create your account"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" onChange={(e) => update("password", e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Age</Label>
                  <Input type="number" placeholder="25" onChange={(e) => update("age", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Sex</Label>
                  <Select onValueChange={(v) => update("sex", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {role === "doctor" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Medical License Number</Label>
                    <Input placeholder="ML-12345" onChange={(e) => update("license", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Doctor ID</Label>
                    <Input placeholder="DOC-001" onChange={(e) => update("doctorId", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Specialization</Label>
                    <Select onValueChange={(v) => update("specialization", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dermatologist">Dermatologist</SelectItem>
                        <SelectItem value="trichologist">Trichologist</SelectItem>
                        <SelectItem value="ophthalmologist">Ophthalmologist</SelectItem>
                        <SelectItem value="general">General Physician</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hospital / Clinic Name</Label>
                    <Input placeholder="City Medical Center" onChange={(e) => update("hospital", e.target.value)} required />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full mt-2">
                {role === "doctor" ? "Submit for Approval" : "Create Account"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to={`/login/${role}`} className="text-primary font-medium hover:underline">Sign In</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
