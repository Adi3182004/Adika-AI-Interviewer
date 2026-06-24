
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
-- authenticated may keep calling has_role from RLS policies; keep execute for that role.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
