
-- Create medical_history table for patient conditions
CREATE TABLE public.medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  has_diabetes BOOLEAN NOT NULL DEFAULT false,
  diabetes_type TEXT, -- type1, type2, gestational
  has_hypertension BOOLEAN NOT NULL DEFAULT false,
  bp_reading TEXT, -- e.g. "140/90"
  has_heart_disease BOOLEAN NOT NULL DEFAULT false,
  heart_condition_details TEXT,
  has_asthma BOOLEAN NOT NULL DEFAULT false,
  has_thyroid BOOLEAN NOT NULL DEFAULT false,
  thyroid_type TEXT, -- hypo, hyper
  has_allergies BOOLEAN NOT NULL DEFAULT false,
  allergy_details TEXT,
  has_epilepsy BOOLEAN NOT NULL DEFAULT false,
  has_kidney_disease BOOLEAN NOT NULL DEFAULT false,
  has_liver_disease BOOLEAN NOT NULL DEFAULT false,
  has_cancer BOOLEAN NOT NULL DEFAULT false,
  cancer_details TEXT,
  blood_group TEXT, -- A+, A-, B+, B-, AB+, AB-, O+, O-
  current_medications TEXT,
  past_surgeries TEXT,
  family_history TEXT,
  smoking_status TEXT, -- never, former, current
  alcohol_status TEXT, -- never, occasional, regular
  other_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own medical history
CREATE POLICY "Users can insert own medical history" ON public.medical_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own medical history" ON public.medical_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own medical history" ON public.medical_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Doctors can view patient medical history (for consultations)
CREATE POLICY "Doctors can view patient medical history" ON public.medical_history
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

-- Admins can view all medical history
CREATE POLICY "Admins can view all medical history" ON public.medical_history
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_medical_history_updated_at
  BEFORE UPDATE ON public.medical_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
