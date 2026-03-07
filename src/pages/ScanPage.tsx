import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, Camera, Image, Lightbulb, Ruler, Focus } from "lucide-react";
import logo from "@/assets/logo.png";

const scanAreas = ["Skin", "Hair", "Eyes", "Nails", "Lips", "Scalp"];

const ScanPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedArea, setSelectedArea] = useState("Skin");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      navigate("/patient/results");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/patient")} className="text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HealthScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-primary-foreground">AI Health Scan</span>
        </div>
      </header>

      <div className="flex-1 container py-6 space-y-5">
        {/* Area Selection */}
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Select Scan Area</h2>
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

        {/* Upload Area */}
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
                        <p className="font-semibold text-sm">Analyzing {selectedArea}...</p>
                      </div>
                    </div>
                  </div>
                )}
                {!scanning && (
                  <button onClick={() => setPreviewUrl(null)} className="absolute top-2 right-2 bg-card/80 rounded-full p-1.5">
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
                <p className="font-semibold text-sm mb-1">Upload {selectedArea} Image</p>
                <p className="text-xs text-muted-foreground">Tap to select from gallery</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-12">
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-12">
            <Camera className="h-4 w-4 mr-2" /> Camera
          </Button>
        </div>

        {previewUrl && !scanning && (
          <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={handleScan}>
            Analyze {selectedArea}
          </Button>
        )}

        {/* Tips */}
        <Card className="bg-accent/50 border-accent shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-accent-foreground mb-2">📸 Tips for Best Results</h3>
            <div className="space-y-2">
              {[
                { icon: Lightbulb, text: "Ensure good, natural lighting" },
                { icon: Ruler, text: "Keep 15-30cm distance from area" },
                { icon: Focus, text: "Hold steady for clear focus" },
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
