import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MedicalHistoryFormProps {
  userId: string;
  readOnly?: boolean;
}

const CONDITIONS = [
  { key: "has_diabetes", label: "🩸 Diabetes", detailKey: "diabetes_type", detailLabel: "Type", detailOptions: ["Type 1", "Type 2", "Gestational"] },
  { key: "has_hypertension", label: "💓 High BP / Hypertension", detailKey: "bp_reading", detailLabel: "BP Reading", detailPlaceholder: "e.g., 140/90" },
  { key: "has_heart_disease", label: "❤️ Heart Disease", detailKey: "heart_condition_details", detailLabel: "Details", detailPlaceholder: "Type of condition..." },
  { key: "has_asthma", label: "🫁 Asthma" },
  { key: "has_thyroid", label: "🦋 Thyroid", detailKey: "thyroid_type", detailLabel: "Type", detailOptions: ["Hypothyroid", "Hyperthyroid"] },
  { key: "has_allergies", label: "🤧 Allergies", detailKey: "allergy_details", detailLabel: "Details", detailPlaceholder: "Drug, food, environmental..." },
  { key: "has_epilepsy", label: "⚡ Epilepsy" },
  { key: "has_kidney_disease", label: "🫘 Kidney Disease" },
  { key: "has_liver_disease", label: "🫀 Liver Disease" },
  { key: "has_cancer", label: "🎗️ Cancer", detailKey: "cancer_details", detailLabel: "Type", detailPlaceholder: "Type of cancer..." },
];

const MedicalHistoryForm = ({ userId, readOnly = false }: MedicalHistoryFormProps) => {
  const { toast } = useToast();
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    const { data: history } = await supabase
      .from("medical_history")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setData(history || {});
    setLoading(false);
  };

  const updateField = (key: string, value: any) => {
    if (readOnly) return;
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      user_id: userId,
      has_diabetes: data.has_diabetes || false,
      diabetes_type: data.diabetes_type || null,
      has_hypertension: data.has_hypertension || false,
      bp_reading: data.bp_reading || null,
      has_heart_disease: data.has_heart_disease || false,
      heart_condition_details: data.heart_condition_details || null,
      has_asthma: data.has_asthma || false,
      has_thyroid: data.has_thyroid || false,
      thyroid_type: data.thyroid_type || null,
      has_allergies: data.has_allergies || false,
      allergy_details: data.allergy_details || null,
      has_epilepsy: data.has_epilepsy || false,
      has_kidney_disease: data.has_kidney_disease || false,
      has_liver_disease: data.has_liver_disease || false,
      has_cancer: data.has_cancer || false,
      cancer_details: data.cancer_details || null,
      blood_group: data.blood_group || null,
      current_medications: data.current_medications || null,
      past_surgeries: data.past_surgeries || null,
      family_history: data.family_history || null,
      smoking_status: data.smoking_status || null,
      alcohol_status: data.alcohol_status || null,
      other_conditions: data.other_conditions || null,
    };

    // Upsert - insert or update
    if (data.id) {
      const { error } = await supabase.from("medical_history").update(payload).eq("id", data.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "✅ Medical history updated!" });
      }
    } else {
      const { error } = await supabase.from("medical_history").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "✅ Medical history saved!" });
        fetchHistory();
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="shadow-card border-border">
        <CardContent className="p-5 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  const activeConditions = CONDITIONS.filter(c => data[c.key]);

  return (
    <Card className="shadow-card border-border">
      <CardContent className="p-5 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-destructive" /> Medical History
        </h3>

        {readOnly && activeConditions.length === 0 && (
          <p className="text-sm text-muted-foreground">No medical conditions recorded.</p>
        )}

        {/* Conditions */}
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((condition) => (
            <div key={condition.key}>
              <label className={`flex items-center gap-2 rounded-lg p-2.5 cursor-pointer transition-colors ${
                data[condition.key] ? 'bg-destructive/10 border border-destructive/20' : 'bg-accent/30 hover:bg-accent/50'
              } ${readOnly ? 'cursor-default' : ''}`}>
                <Checkbox
                  checked={data[condition.key] || false}
                  onCheckedChange={(checked) => updateField(condition.key, !!checked)}
                  disabled={readOnly}
                />
                <span className="text-xs font-medium">{condition.label}</span>
              </label>
              {/* Detail field when checked */}
              {data[condition.key] && condition.detailKey && (
                <div className="mt-1 ml-2">
                  {condition.detailOptions ? (
                    <Select
                      value={data[condition.detailKey] || ""}
                      onValueChange={(v) => updateField(condition.detailKey!, v)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={condition.detailLabel} /></SelectTrigger>
                      <SelectContent>
                        {condition.detailOptions.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-7 text-xs"
                      placeholder={condition.detailPlaceholder}
                      value={data[condition.detailKey] || ""}
                      onChange={(e) => updateField(condition.detailKey!, e.target.value)}
                      disabled={readOnly}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Blood Group */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Blood Group</Label>
            <Select
              value={data.blood_group || ""}
              onValueChange={(v) => updateField("blood_group", v)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Smoking</Label>
            <Select
              value={data.smoking_status || ""}
              onValueChange={(v) => updateField("smoking_status", v)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="former">Former</SelectItem>
                <SelectItem value="current">Current</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Alcohol</Label>
            <Select
              value={data.alcohol_status || ""}
              onValueChange={(v) => updateField("alcohol_status", v)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="occasional">Occasional</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Text fields */}
        <div className="space-y-1.5">
          <Label className="text-xs">Current Medications</Label>
          <Input
            className="text-xs"
            placeholder="e.g., Metformin 500mg, Amlodipine 5mg..."
            value={data.current_medications || ""}
            onChange={(e) => updateField("current_medications", e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Past Surgeries</Label>
          <Input
            className="text-xs"
            placeholder="e.g., Appendectomy 2020..."
            value={data.past_surgeries || ""}
            onChange={(e) => updateField("past_surgeries", e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Family History</Label>
          <Textarea
            className="text-xs"
            placeholder="e.g., Father - diabetes, Mother - hypertension..."
            value={data.family_history || ""}
            onChange={(e) => updateField("family_history", e.target.value)}
            rows={2}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Other Conditions</Label>
          <Input
            className="text-xs"
            placeholder="Any other medical conditions..."
            value={data.other_conditions || ""}
            onChange={(e) => updateField("other_conditions", e.target.value)}
            disabled={readOnly}
          />
        </div>

        {!readOnly && (
          <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Medical History
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicalHistoryForm;
