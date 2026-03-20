
-- 1. Drop the insecure "Users can insert own role" policy
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- 2. Fix handle_new_user_role trigger to only allow patient/doctor roles from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _requested text;
BEGIN
  _requested := NEW.raw_user_meta_data->>'role';
  
  -- Only allow patient and doctor from user metadata; default to patient
  IF _requested = 'doctor' THEN
    _role := 'doctor'::app_role;
  ELSE
    _role := 'patient'::app_role;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 3. Fix phone_otp RLS: drop all public policies and restrict access
DROP POLICY IF EXISTS "Anyone can request OTP" ON public.phone_otp;
DROP POLICY IF EXISTS "Anyone can verify OTP" ON public.phone_otp;
DROP POLICY IF EXISTS "Anyone can update OTP" ON public.phone_otp;
DROP POLICY IF EXISTS "Anyone can delete OTP" ON public.phone_otp;

-- phone_otp is managed exclusively by edge functions using service role, no client access needed
