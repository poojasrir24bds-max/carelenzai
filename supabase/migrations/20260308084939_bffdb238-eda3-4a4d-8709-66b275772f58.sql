-- Add license document columns to doctor_profiles
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS license_document_url text,
ADD COLUMN IF NOT EXISTS license_verification_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS license_verification_notes text,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid;

-- Create storage bucket for license documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('license-documents', 'license-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own license documents
CREATE POLICY "Users can upload own license documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'license-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to view their own license documents
CREATE POLICY "Users can view own license documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'license-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow admins to view all license documents
CREATE POLICY "Admins can view all license documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'license-documents' AND public.has_role(auth.uid(), 'admin'));
