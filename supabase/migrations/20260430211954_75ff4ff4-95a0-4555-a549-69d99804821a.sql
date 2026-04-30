-- Allow authenticated users to insert their own role
CREATE POLICY "Users insert own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own establishment
CREATE POLICY "Users insert own establishment"
ON public.establishments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own issuer
CREATE POLICY "Users insert own issuer"
ON public.issuers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
