-- Drop the existing public SELECT policy on users table
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

-- Create a new policy that only allows authenticated users to view profiles
CREATE POLICY "Authenticated users can view all profiles"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Allow users to view their own profile specifically (for additional clarity)
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);