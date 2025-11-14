-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own profile with email" ON public.users;

-- Block all anonymous SELECT access explicitly
CREATE POLICY "Block anonymous SELECT on users"
ON public.users
FOR SELECT
TO anon
USING (false);

-- Only allow authenticated users to SELECT their own profile
CREATE POLICY "Users can only view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);