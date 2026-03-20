import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, Camera, Image, Lightbulb, Ruler, Focus } from "lucide-react";
import DentalBottomNav from "@/components/dental/BottomNav";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

const categories = [
  { id: "dental", label: "🦷 Dental", types: ["Clinical Photo", "X-Ray", "Intraoral", "Panoramic"] },
  { id: "body", label: "🩺 Body", types: ["Skin", "Hair", "Eyes", "Nails", "Lips", "Scalp"] },
];

const DentalScan = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasActiveSubscription, scansRemaining, loading: subLoading } = useSubscription();
  const [activeCategory, setActiveCategory] = useState("dental");
  const [selectedType, setSelectedType] = useState("Clinical Photo");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  // Subscription check moved to handleScan - allow upload without subscription

  const currentCategory = categories.find((c) => c.id === activeCategory)!;
  const isDental = activeCategory === "dental";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleScan = async () => {
    if (!selectedFile || !user) return;

    // Check subscription before running AI analysis
    if (!hasActiveSubscription) {
      toast({
        title: "Subscription Required",
        description: "Subscribe to a plan to unlock AI analysis results.",
      });
      navigate("/subscription");
      return;
    }

    if (scansRemaining <= 0) {
      toast({
        title: "Scan limit reached",
        description: "You have used all your scans. Please upgrade your plan.",
        variant: "destructive",
      });
      navigate("/subscription");
      return;
    }

    setScanning(true);

    try {
      const imageBase64 = await fileToBase64(selectedFile);

      if (isDental) {
        // Dental scan
        const { data, error } = await supabase.functions.invoke("dental-analyze", {
          body: { imageBase64, scanType: selectedType.toLowerCase() },
        });
        if (error) throw error;

        const { data: scanData, error: scanError } = await supabase.from("dental_scans" as any).insert({
          user_id: user.id,
          scan_type: selectedType.toLowerCase(),
          teeth_identified: data.teeth_identified,
          conditions_found: data.conditions_found,
          overall_assessment: data.overall_assessment,
          clinical_notes: data.clinical_notes,
          severity: data.severity,
          confidence: data.confidence,
          recommendations: data.recommendations,
        } as any).select().single();
        if (scanError) throw scanError;

        // Increment scans_used
        await supabase.rpc("increment_scans_used" as any, { _user_id: user.id });

        navigate("/dental/results", { state: { result: data, scanId: (scanData as any)?.id, scanMode: "dental" } });
      } else {
        // Body scan (skin, hair, eyes, etc.)
        const { data, error } = await supabase.functions.invoke("ai-diagnose", {
          body: { imageBase64, area: selectedType.toLowerCase() },
        });
        if (error) throw error;

        const { data: scanData, error: scanError } = await supabase.from("scans").insert({
          user_id: user.id,
          area: selectedType.toLowerCase(),
          condition: data.condition,
          definition: data.definition,
          causes: data.causes,
          severity: data.severity,
          confidence: data.confidence,
          guidance: data.guidance,
        }).select().single();
        if (scanError) throw scanError;

        // Increment scans_used
        await supabase.rpc("increment_scans_used" as any, { _user_id: user.id });

        navigate("/dental/results", { state: { result: data, scanId: scanData.id, scanMode: "body" } });
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({ title: "Scan failed", description: err.message || "Please try again.", variant: "destructive" });
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,45%)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/dental")} className="text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="CareLenz AI" className="h-7 w-7" />
          <span className="font-display font-bold text-white">AI Health Scan</span>
        </div>
      </header>

      <div className="flex-1 container py-5 space-y-4">
        {/* Category Toggle */}
        <div className="flex gap-2 bg-muted rounded-xl p-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelectedType(cat.types[0]); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Type Selection */}
        <div>
          <h2 className="font-display font-semibold text-sm mb-2">{isDental ? "Image Type" : "Scan Area"}</h2>
          <div className="flex flex-wrap gap-2">
            {currentCategory.types.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedType === type
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border text-foreground hover:border-primary"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        <Card className="border-border shadow-card">
          <CardContent className="p-4">
            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={previewUrl} alt="Scan preview" className="w-full h-56 object-cover rounded-xl" />
                {scanning && (
                  <div className="absolute inset-0 bg-foreground/20 rounded-xl">
                    <div className="absolute left-0 right-0 h-0.5 bg-primary animate-scan-line shadow-elevated" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-card/90 rounded-xl px-5 py-3 text-center">
                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="font-semibold text-sm">Analyzing {selectedType}...</p>
                        <p className="text-xs text-muted-foreground mt-1">AI is processing your image</p>
                      </div>
                    </div>
                  </div>
                )}
                {!scanning && (
                  <button onClick={() => { setPreviewUrl(null); setSelectedFile(null); }} className="absolute top-2 right-2 bg-card/80 rounded-full p-1.5 text-sm">✕</button>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl h-56 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-all"
              >
                <Image className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-semibold text-sm mb-1">Upload {selectedType} Image</p>
                <p className="text-xs text-muted-foreground">{isDental ? "X-ray, intraoral photo, or clinical image" : "Tap to select from gallery"}</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-11">
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-11">
            <Camera className="h-4 w-4 mr-2" /> Camera
          </Button>
        </div>

        {previewUrl && !scanning && (
          <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={handleScan}>
            {isDental ? "🦷" : "🔬"} Analyze {selectedType}
          </Button>
        )}

        {/* Disclaimer */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
          <p className="text-xs text-foreground">
            ⚠️ <strong>AI Screening Only:</strong> This tool provides AI-powered screening for educational purposes. No prescription is generated. Consult a qualified professional for medical/dental advice.
          </p>
        </div>

        {/* Tips */}
        <Card className="bg-primary/5 border-primary/20 shadow-card">
          <CardContent className="p-3">
            <h3 className="font-semibold text-xs mb-1.5">📸 Tips for Best Results</h3>
            <div className="space-y-1.5">
              {[
                { icon: Lightbulb, text: "Use good, natural lighting" },
                { icon: Ruler, text: isDental ? "Capture full dental arch when possible" : "Keep 15-30cm distance from area" },
                { icon: Focus, text: "Hold steady for clear focus" },
              ].map((tip) => (
                <div key={tip.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <tip.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <DentalBottomNav />
    </div>
  );
};

export default DentalScan;
