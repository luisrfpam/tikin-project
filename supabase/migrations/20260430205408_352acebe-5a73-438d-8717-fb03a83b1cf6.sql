
-- The remaining warnings are about has_role and handle_new_user being SECURITY DEFINER
-- has_role needs to stay SECURITY DEFINER for RLS but let's restrict it properly
-- handle_new_user is a trigger function so it can't be called directly anyway

-- Revoke execute from public role on all security definer functions
DO $$
BEGIN
  -- Revoke from public (catches all roles)
  EXECUTE 'REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM public';
  EXECUTE 'REVOKE ALL ON FUNCTION public.handle_new_user() FROM public';
  
  -- Re-grant has_role only to authenticated (needed for RLS)
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated';
END $$;
