
CREATE OR REPLACE FUNCTION public.handle_new_doctor_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create doctor profile if role is 'doctor' and required fields exist
  IF (NEW.raw_user_meta_data->>'role') = 'doctor' 
     AND (NEW.raw_user_meta_data->>'license') IS NOT NULL THEN
    INSERT INTO public.doctor_profiles (user_id, medical_license, doctor_id, specialization, hospital_name, address)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'license', ''),
      COALESCE(NEW.raw_user_meta_data->>'doctorId', ''),
      COALESCE(NEW.raw_user_meta_data->>'specialization', ''),
      COALESCE(NEW.raw_user_meta_data->>'hospital', ''),
      NEW.raw_user_meta_data->>'address'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_doctor
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_doctor_profile();
