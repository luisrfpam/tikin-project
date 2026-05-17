
-- Revoke anon execute on security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon;

-- Fix audit_logs insert policy to require actor_id = auth.uid()
DROP POLICY "Authenticated insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
