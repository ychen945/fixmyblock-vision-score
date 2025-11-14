-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Block anonymous SELECT on users" ON public.users;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.users;

-- Allow everyone to view basic public profile info (display_name, avatar_url)
-- This is needed for showing usernames in report feeds, replies, etc.
CREATE POLICY "Public profiles are viewable by everyone"
ON public.users
FOR SELECT
USING (true);

-- Users can still only update their own profile
-- (keeping the existing update policy)