import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, Info } from "lucide-react";
import DentalBottomNav from "@/components/dental/BottomNav";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const severityColors: Record<string, string> = {
  normal: "bg-success/20 text-success",
  mild: "bg-primary/20 text-primary",
  moderate: "bg-warning/20 text-warning",
  severe: "bg-destructive/20 text-destructive",
};

const DentalHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchScans = async () => {
      const { data } = await supabase
        .from("dental_scans" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setScans((data as any[]) || []);
      setLoading(false);
    };
    fetchScans();
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,45%)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/dental")} className="text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="DentalScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-white">Scan History</span>
        </div>
      </header>

      <div className="flex-1 container py-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-sm">No scan history yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your dental scans will appear here</p>
          </div>
        ) : (
          scans.map((scan: any) => (
            <Card
              key={scan.id}
              className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all"
              onClick={() => navigate("/dental/results", { state: { result: scan, scanId: scan.id } })}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm capitalize">{scan.scan_type} Scan</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(scan.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${severityColors[scan.severity] || severityColors.normal}`}>
                    {scan.severity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{scan.overall_assessment}</p>
                {scan.conditions_found?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {scan.conditions_found.slice(0, 3).map((c: string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{c}</span>
                    ))}
                    {scan.conditions_found.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{scan.conditions_found.length - 3}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <DentalBottomNav />
    </div>
  );
};

export default DentalHistory;
