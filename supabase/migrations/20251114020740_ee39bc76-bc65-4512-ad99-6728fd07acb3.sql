-- Insert all Chicago neighborhoods as blocks
INSERT INTO public.blocks (slug, name, need_score) VALUES
  ('loop', 'Loop', 45),
  ('river-north', 'River North', 32),
  ('lincoln-park', 'Lincoln Park', 28),
  ('wicker-park', 'Wicker Park', 38),
  ('logan-square', 'Logan Square', 52),
  ('bucktown', 'Bucktown', 35),
  ('pilsen', 'Pilsen', 68),
  ('hyde-park', 'Hyde Park', 41),
  ('wrigleyville', 'Wrigleyville', 29),
  ('gold-coast', 'Gold Coast', 22),
  ('south-loop', 'South Loop', 48),
  ('west-loop', 'West Loop', 36),
  ('bronzeville', 'Bronzeville', 71),
  ('uptown', 'Uptown', 55),
  ('andersonville', 'Andersonville', 31),
  ('old-town', 'Old Town', 26),
  ('streeterville', 'Streeterville', 24),
  ('chinatown', 'Chinatown', 58)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  need_score = EXCLUDED.need_score;