
-- Allow deletion of expired OTPs
CREATE POLICY "Anyone can delete OTP" ON public.phone_otp FOR DELETE TO anon, authenticated USING (true);
