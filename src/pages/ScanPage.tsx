import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, Camera, Image, Lightbulb, Ruler, Focus } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import LanguageToggle from "@/components/LanguageToggle";

const scanAreas = ["Skin", "Hair", "Eyes", "Nails", "Lips", "Scalp", "Dental"];

const ScanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { hasActiveSubscription, scansRemaining, loading: subLoading } = useSubscription();
  const initialArea = (location.state as any)?.area || "Skin";
  const [selectedArea, setSelectedArea] = useState(initialArea);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  // Subscription check moved to handleScan - allow upload without subscription

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleScan = async () => {
    if (!selectedFile || !user) return;
    setScanning(true);

    try {
      const imageBase64 = await fileToBase64(selectedFile);

      const { data, error } = await supabase.functions.invoke("ai-diagnose", {
        body: { imageBase64, area: selectedArea.toLowerCase() },
      });

      if (error) throw error;

      const { data: scanData, error: scanError } = await supabase.from("scans").insert({
        user_id: user.id,
        area: selectedArea.toLowerCase(),
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

      navigate("/patient/results", { state: { result: data, scanId: scanData.id } });
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({
        title: "Scan failed",
        description: err.message || "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/patient")} className="text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="CARELENZ AI" className="h-7 w-7" />
            <span className="font-display font-bold text-primary-foreground">{t("scan.title")}</span>
          </div>
        </div>
        <LanguageToggle variant="header" />
      </header>

      <div className="flex-1 container py-6 space-y-5">
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">{t("scan.selectArea")}</h2>
          <div className="flex flex-wrap gap-2">
            {scanAreas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedArea === area
                    ? "bg-primary text-primary-foreground shadow-elevated"
                    : "bg-card border border-border text-foreground hover:border-primary"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <Card className="border-border shadow-card">
          <CardContent className="p-5">
            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={previewUrl} alt="Scan preview" className="w-full h-64 object-cover rounded-xl" />
                {scanning && (
                  <div className="absolute inset-0 bg-foreground/20 rounded-xl">
                    <div className="absolute left-0 right-0 h-0.5 bg-primary animate-scan-line shadow-elevated" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-card/90 rounded-xl px-5 py-3 text-center">
                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="font-semibold text-sm">{t("scan.analyzing")} {selectedArea}...</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("scan.aiProcessing")}</p>
                      </div>
                    </div>
                  </div>
                )}
                {!scanning && (
                  <button onClick={() => { setPreviewUrl(null); setSelectedFile(null); }} className="absolute top-2 right-2 bg-card/80 rounded-full p-1.5">
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-all"
              >
                <Image className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="font-semibold text-sm mb-1">{t("scan.upload")} {selectedArea}</p>
                <p className="text-xs text-muted-foreground">{t("scan.tapToSelect")}</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-12">
            <Upload className="h-4 w-4 mr-2" /> {t("scan.upload")}
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-12">
            <Camera className="h-4 w-4 mr-2" /> {t("scan.camera")}
          </Button>
        </div>

        {previewUrl && !scanning && (
          <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={handleScan}>
            {t("scan.analyze")} {selectedArea}
          </Button>
        )}

        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
          <p className="text-xs text-foreground">{t("scan.disclaimer")}</p>
        </div>

        <Card className="bg-accent/50 border-accent shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-accent-foreground mb-2">{t("scan.tips")}</h3>
            <div className="space-y-2">
              {[
                { icon: Lightbulb, text: t("scan.tip1") },
                { icon: Ruler, text: t("scan.tip2") },
                { icon: Focus, text: t("scan.tip3") },
              ].map((tip) => (
                <div key={tip.text} className="flex items-center gap-2 text-xs text-accent-foreground/80">
                  <tip.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScanPage;
