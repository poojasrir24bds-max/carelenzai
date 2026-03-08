
CREATE OR REPLACE FUNCTION public.increment_consultations_used(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET consultations_used = consultations_used + 1, updated_at = now()
  WHERE user_id = _user_id
    AND status = 'active'
    AND approved_at IS NOT NULL;
END;
$$;
