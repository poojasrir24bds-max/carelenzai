
-- Create call_recordings table
CREATE TABLE public.call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  recording_url text NOT NULL,
  duration_seconds integer,
  file_size_bytes bigint,
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- Only admins can view recordings
CREATE POLICY "Admins can view all recordings"
ON public.call_recordings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert their own recordings
CREATE POLICY "Users can insert own recordings"
ON public.call_recordings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = recorded_by);

-- Storage bucket for recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('call-recordings', 'call-recordings', false);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'call-recordings');

-- Admins can read recordings
CREATE POLICY "Admins can read recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'call-recordings' AND public.has_role(auth.uid(), 'admin'));
