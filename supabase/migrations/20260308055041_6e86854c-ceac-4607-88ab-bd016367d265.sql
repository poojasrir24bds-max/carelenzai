CREATE TABLE public.dental_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scan_type text NOT NULL DEFAULT 'clinical',
  teeth_identified jsonb DEFAULT '[]'::jsonb,
  conditions_found text[] DEFAULT '{}',
  overall_assessment text,
  clinical_notes text[],
  severity text DEFAULT 'normal',
  confidence integer DEFAULT 0,
  recommendations text[],
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dental_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own dental scans"
ON public.dental_scans FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own dental scans"
ON public.dental_scans FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all dental scans"
ON public.dental_scans FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));