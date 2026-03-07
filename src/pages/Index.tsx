import { useNavigate } from "react-router-dom";
import { User, Stethoscope, Shield, ScanLine, Activity, Heart } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";
import logo from "@/assets/logo.png";

const roles = [
  {
    id: "patient",
    title: "Patient",
    description: "Scan symptoms, get health insights, and connect with doctors",
    icon: User,
    color: "bg-primary",
  },
  {
    id: "doctor",
    title: "Doctor",
    description: "Manage consultations, view patient scans, and provide guidance",
    icon: Stethoscope,
    color: "bg-secondary",
  },
  {
    id: "admin",
    title: "Admin",
    description: "Full platform control, manage users, doctors, and analytics",
    icon: Shield,
    color: "bg-accent",
  },
];

const features = [
  { icon: ScanLine, title: "AI Body Scan", desc: "Analyze skin, hair, eyes, nails & more" },
  { icon: Activity, title: "Health Insights", desc: "Get severity analysis and guidance" },
  { icon: Stethoscope, title: "Doctor Connect", desc: "Match with specialists instantly" },
  { icon: Heart, title: "Track Progress", desc: "Monitor your health over time" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="HealthScan AI" className="h-8 w-8" />
          <span className="font-display font-bold text-lg text-primary-foreground">HealthScan AI</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBanner} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 gradient-primary opacity-10" />
        </div>
        <div className="relative container py-12 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <ScanLine className="h-4 w-4" />
            AI-Powered Health Awareness
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Your Health,{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
              Scanned & Analyzed
            </span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-10">
            Upload or scan body features to detect possible health conditions. Get AI-powered insights and connect with verified specialists.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mb-12">
            {features.map((f) => (
              <div key={f.title} className="bg-card rounded-xl p-4 shadow-card text-center">
                <f.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="container py-10">
        <h2 className="text-center font-display text-2xl font-bold mb-2">Get Started</h2>
        <p className="text-center text-muted-foreground mb-8">Select your role to continue</p>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {roles.map((role, i) => (
            <button
              key={role.id}
              onClick={() => navigate(`/login/${role.id}`)}
              className="group bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 text-left border border-border hover:border-primary"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`${role.color} h-12 w-12 rounded-xl flex items-center justify-center mb-4`}>
                <role.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg mb-1">{role.title}</h3>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="container py-6 text-center border-t border-border">
        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          ⚠️ Medical Disclaimer: This platform provides health awareness only and does NOT provide medical diagnosis or prescriptions.
          Always consult a qualified healthcare professional for medical advice.
        </p>
      </footer>
    </div>
  );
};

export default Index;
