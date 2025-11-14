-- Helper function to pick a random human avatar
CREATE OR REPLACE FUNCTION public.random_avatar_url()
RETURNS text AS $$
DECLARE
  avatars text[] := ARRAY[
    'https://i.pravatar.cc/150?img=12',
    'https://i.pravatar.cc/150?img=25',
    'https://i.pravatar.cc/150?img=32',
    'https://i.pravatar.cc/150?img=45',
    'https://i.pravatar.cc/150?img=5',
    'https://i.pravatar.cc/150?img=56',
    'https://i.pravatar.cc/150?img=60',
    'https://i.pravatar.cc/150?img=68',
    'https://i.pravatar.cc/150?img=72',
    'https://i.pravatar.cc/150?img=80'
  ];
BEGIN
  RETURN avatars[1 + floor(random() * array_length(avatars, 1))::int];
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Update the handle_new_user trigger to fall back to the random avatar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous User'),
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''), public.random_avatar_url())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing users that do not yet have an avatar
UPDATE public.users
SET avatar_url = public.random_avatar_url()
WHERE avatar_url IS NULL OR trim(avatar_url) = '';
