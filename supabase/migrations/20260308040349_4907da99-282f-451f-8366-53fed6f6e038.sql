
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'patient', 'doctor');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  age INTEGER,
  sex TEXT CHECK (sex IN ('male', 'female', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Allowed admins table (5-member lock)
CREATE TABLE public.allowed_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view allowed admins" ON public.allowed_admins FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Doctor profiles table
CREATE TABLE public.doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  medical_license TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  specialization TEXT NOT NULL,
  hospital_name TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own profile" ON public.doctor_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Doctors can update own profile" ON public.doctor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can insert own profile" ON public.doctor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients can view verified doctors" ON public.doctor_profiles FOR SELECT USING (is_verified = true);
CREATE POLICY "Admins can view all doctors" ON public.doctor_profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update doctor profiles" ON public.doctor_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_doctor_profiles_updated_at BEFORE UPDATE ON public.doctor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scans table
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('skin', 'hair', 'eyes', 'nails', 'lips', 'scalp')),
  image_url TEXT,
  condition TEXT,
  definition TEXT,
  causes TEXT[],
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  confidence INTEGER,
  guidance JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans" ON public.scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all scans" ON public.scans FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Patient doubts / Q&A
CREATE TABLE public.patient_doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  doctor_id UUID REFERENCES auth.users(id),
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_doubts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own doubts" ON public.patient_doubts FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients can insert own doubts" ON public.patient_doubts FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors can view assigned doubts" ON public.patient_doubts FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update assigned doubts" ON public.patient_doubts FOR UPDATE USING (auth.uid() = doctor_id);
CREATE POLICY "Admins can view all doubts" ON public.patient_doubts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_patient_doubts_updated_at BEFORE UPDATE ON public.patient_doubts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Consultations table
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_id UUID REFERENCES public.scans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  notes TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own consultations" ON public.consultations FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients can insert consultations" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors can view assigned consultations" ON public.consultations FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update assigned consultations" ON public.consultations FOR UPDATE USING (auth.uid() = doctor_id);
CREATE POLICY "Admins can view all consultations" ON public.consultations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if admin signup is allowed
CREATE OR REPLACE FUNCTION public.is_admin_email_allowed(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_admins WHERE email = lower(_email)
  )
$$;

-- Function to count current admins
CREATE OR REPLACE FUNCTION public.admin_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.user_roles WHERE role = 'admin'
$$;

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for scan images
INSERT INTO storage.buckets (id, name, public) VALUES ('scan-images', 'scan-images', false);

CREATE POLICY "Users can upload scan images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own scan images" ON storage.objects FOR SELECT USING (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all scan images" ON storage.objects FOR SELECT USING (bucket_id = 'scan-images' AND public.has_role(auth.uid(), 'admin'));
