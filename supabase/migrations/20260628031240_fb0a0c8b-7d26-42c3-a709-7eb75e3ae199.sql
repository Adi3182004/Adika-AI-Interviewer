
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_application_stage() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_application() FROM anon, authenticated;
