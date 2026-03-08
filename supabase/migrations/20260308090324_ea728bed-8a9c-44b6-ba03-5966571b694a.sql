
-- Add Aadhaar/ID verification fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS aadhaar_number TEXT,
ADD COLUMN IF NOT EXISTS id_verification_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS id_verification_notes TEXT;

-- Create storage bucket for patient ID documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: patients can upload their own ID docs
CREATE POLICY "Users can upload own ID documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'id-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: patients can view their own ID docs
CREATE POLICY "Users can view own ID documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'id-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: admins can view all ID docs
CREATE POLICY "Admins can view all ID documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'id-documents' AND public.has_role(auth.uid(), 'admin'));
