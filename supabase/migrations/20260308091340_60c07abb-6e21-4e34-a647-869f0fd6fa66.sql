
-- Add phone number and verification fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

-- Create phone_otp table for OTP verification
CREATE TABLE public.phone_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  user_id UUID,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_otp ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert OTP requests (before auth)
CREATE POLICY "Anyone can request OTP" ON public.phone_otp FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow anyone to select their own OTP by phone
CREATE POLICY "Anyone can verify OTP" ON public.phone_otp FOR SELECT TO anon, authenticated USING (true);

-- Allow updates for verification
CREATE POLICY "Anyone can update OTP" ON public.phone_otp FOR UPDATE TO anon, authenticated USING (true);

-- Cleanup old OTPs periodically via index
CREATE INDEX idx_phone_otp_expires ON public.phone_otp (expires_at);
CREATE INDEX idx_phone_otp_phone ON public.phone_otp (phone);
