
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS room_id text UNIQUE DEFAULT gen_random_uuid()::text;

ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
