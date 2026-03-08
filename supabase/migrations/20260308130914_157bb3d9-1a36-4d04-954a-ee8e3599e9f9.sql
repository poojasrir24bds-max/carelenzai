
-- Ratings table for both doctor-to-patient and patient-to-doctor ratings
CREATE TABLE public.consultation_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  rated_by UUID NOT NULL,
  rated_user UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(consultation_id, rated_by)
);

ALTER TABLE public.consultation_ratings ENABLE ROW LEVEL SECURITY;

-- Users can insert their own ratings
CREATE POLICY "Users can insert own ratings"
ON public.consultation_ratings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = rated_by);

-- Users can view ratings they gave or received
CREATE POLICY "Users can view own ratings"
ON public.consultation_ratings FOR SELECT TO authenticated
USING (auth.uid() = rated_by OR auth.uid() = rated_user);

-- Admins can view all ratings
CREATE POLICY "Admins can view all ratings"
ON public.consultation_ratings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
