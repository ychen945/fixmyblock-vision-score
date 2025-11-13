-- Fix RLS policy for reports table - require authentication to mark as resolved
DROP POLICY IF EXISTS "Anyone can mark reports as resolved" ON public.reports;

CREATE POLICY "Authenticated users can mark reports as resolved"
ON public.reports
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (status = 'resolved'::report_status);

-- Insert Chicago blocks seed data
INSERT INTO public.blocks (slug, name, need_score) VALUES
('loop', 'The Loop', 0),
('river-north', 'River North', 0),
('lincoln-park', 'Lincoln Park', 0),
('wicker-park', 'Wicker Park', 0),
('logan-square', 'Logan Square', 0),
('pilsen', 'Pilsen', 0),
('bridgeport', 'Bridgeport', 0),
('hyde-park', 'Hyde Park', 0),
('south-loop', 'South Loop', 0),
('west-loop', 'West Loop', 0),
('gold-coast', 'Gold Coast', 0),
('old-town', 'Old Town', 0),
('lakeview', 'Lakeview', 0),
('andersonville', 'Andersonville', 0),
('uptown', 'Uptown', 0)
ON CONFLICT (slug) DO NOTHING;