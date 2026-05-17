
-- Fix search_path on update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke anon from has_role again (belt and suspenders)  
REVOKE ALL ON FUNCTION public.has_role(UUID, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
