
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS address text;
