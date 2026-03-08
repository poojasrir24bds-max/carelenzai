ALTER TABLE public.scans DROP CONSTRAINT scans_area_check;
ALTER TABLE public.scans ADD CONSTRAINT scans_area_check CHECK (area = ANY (ARRAY['skin','hair','eyes','nails','lips','scalp','dental']));