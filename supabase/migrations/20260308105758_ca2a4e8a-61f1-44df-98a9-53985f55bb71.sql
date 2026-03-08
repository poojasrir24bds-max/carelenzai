
-- Delete all test data from public tables
DELETE FROM public.user_subscriptions;
DELETE FROM public.call_recordings;
DELETE FROM public.consultations;
DELETE FROM public.patient_doubts;
DELETE FROM public.dental_scans;
DELETE FROM public.scans;
DELETE FROM public.medical_history;
DELETE FROM public.doctor_profiles;
DELETE FROM public.phone_otp;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Delete all test users from auth
DELETE FROM auth.users;
