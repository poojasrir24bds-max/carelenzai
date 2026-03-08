
-- Fix profiles RLS: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix user_roles RLS: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix scans RLS
DROP POLICY IF EXISTS "Admins can view all scans" ON public.scans;
DROP POLICY IF EXISTS "Users can view own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can insert own scans" ON public.scans;

CREATE POLICY "Admins can view all scans" ON public.scans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own scans" ON public.scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON public.scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix dental_scans RLS
DROP POLICY IF EXISTS "Admins can view all dental scans" ON public.dental_scans;
DROP POLICY IF EXISTS "Users can view own dental scans" ON public.dental_scans;
DROP POLICY IF EXISTS "Users can insert own dental scans" ON public.dental_scans;

CREATE POLICY "Admins can view all dental scans" ON public.dental_scans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own dental scans" ON public.dental_scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dental scans" ON public.dental_scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix user_subscriptions RLS
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;

CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all subscriptions" ON public.user_subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix consultations RLS
DROP POLICY IF EXISTS "Admins can view all consultations" ON public.consultations;
DROP POLICY IF EXISTS "Patients can view own consultations" ON public.consultations;
DROP POLICY IF EXISTS "Doctors can view assigned consultations" ON public.consultations;
DROP POLICY IF EXISTS "Doctors can update assigned consultations" ON public.consultations;
DROP POLICY IF EXISTS "Patients can insert consultations" ON public.consultations;

CREATE POLICY "Admins can view all consultations" ON public.consultations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Patients can view own consultations" ON public.consultations FOR SELECT TO authenticated USING (auth.uid() = patient_id);
CREATE POLICY "Doctors can view assigned consultations" ON public.consultations FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update assigned consultations" ON public.consultations FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Patients can insert consultations" ON public.consultations FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);

-- Fix patient_doubts RLS
DROP POLICY IF EXISTS "Admins can view all doubts" ON public.patient_doubts;
DROP POLICY IF EXISTS "Patients can view own doubts" ON public.patient_doubts;
DROP POLICY IF EXISTS "Patients can insert own doubts" ON public.patient_doubts;
DROP POLICY IF EXISTS "Doctors can view assigned doubts" ON public.patient_doubts;
DROP POLICY IF EXISTS "Doctors can update assigned doubts" ON public.patient_doubts;

CREATE POLICY "Admins can view all doubts" ON public.patient_doubts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Patients can view own doubts" ON public.patient_doubts FOR SELECT TO authenticated USING (auth.uid() = patient_id);
CREATE POLICY "Patients can insert own doubts" ON public.patient_doubts FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors can view assigned doubts" ON public.patient_doubts FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update assigned doubts" ON public.patient_doubts FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);

-- Fix medical_history RLS
DROP POLICY IF EXISTS "Admins can view all medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Users can view own medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Users can insert own medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Users can update own medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Doctors can view patient medical history" ON public.medical_history;

CREATE POLICY "Admins can view all medical history" ON public.medical_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own medical history" ON public.medical_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medical history" ON public.medical_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medical history" ON public.medical_history FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient medical history" ON public.medical_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'::app_role));

-- Fix doctor_profiles RLS
DROP POLICY IF EXISTS "Admins can view all doctors" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Admins can update doctor profiles" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Doctors can view own profile" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Doctors can insert own profile" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Doctors can update own profile" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Patients can view verified doctors" ON public.doctor_profiles;

CREATE POLICY "Admins can view all doctors" ON public.doctor_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update doctor profiles" ON public.doctor_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Doctors can view own profile" ON public.doctor_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Doctors can insert own profile" ON public.doctor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Doctors can update own profile" ON public.doctor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Patients can view verified doctors" ON public.doctor_profiles FOR SELECT TO authenticated USING (is_verified = true);

-- Fix allowed_admins RLS
DROP POLICY IF EXISTS "Admins can view allowed admins" ON public.allowed_admins;
CREATE POLICY "Admins can view allowed admins" ON public.allowed_admins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix call_recordings RLS
DROP POLICY IF EXISTS "Admins can view all recordings" ON public.call_recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON public.call_recordings;
CREATE POLICY "Admins can view all recordings" ON public.call_recordings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own recordings" ON public.call_recordings FOR INSERT TO authenticated WITH CHECK (auth.uid() = recorded_by);

-- Fix subscription_plans RLS
DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT TO authenticated USING (is_active = true);

-- Fix phone_otp RLS
DROP POLICY IF EXISTS "Anyone can request OTP" ON public.phone_otp;
DROP POLICY IF EXISTS "Anyone can verify OTP" ON public.phone_otp;
DROP POLICY IF EXISTS "Anyone can update OTP" ON public.phone_otp;
DROP POLICY IF EXISTS "Anyone can delete OTP" ON public.phone_otp;
CREATE POLICY "Anyone can request OTP" ON public.phone_otp FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can verify OTP" ON public.phone_otp FOR SELECT USING (true);
CREATE POLICY "Anyone can update OTP" ON public.phone_otp FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete OTP" ON public.phone_otp FOR DELETE USING (true);
