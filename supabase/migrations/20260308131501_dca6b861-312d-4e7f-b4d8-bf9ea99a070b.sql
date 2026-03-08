CREATE TABLE public.app_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.app_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own app rating" ON public.app_ratings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own app rating" ON public.app_ratings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all app ratings" ON public.app_ratings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));