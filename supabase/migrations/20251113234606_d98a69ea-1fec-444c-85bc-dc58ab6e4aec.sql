-- Update existing users without avatars to have random DiceBear avatars
UPDATE users 
SET avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id::text
WHERE avatar_url IS NULL OR avatar_url = '';

-- Update the handle_new_user function to automatically assign avatars
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous'),
    NEW.email,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
  );
  RETURN NEW;
END;
$$;