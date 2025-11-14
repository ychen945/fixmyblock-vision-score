-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Create a policy that only allows users to see their own complete profile
CREATE POLICY "Users can view own profile with email"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a view for public profiles without email addresses
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  contribution_score,
  created_at
FROM public.users;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;