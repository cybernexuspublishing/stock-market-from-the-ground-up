BEGIN;
INSERT INTO public.site_settings(setting_key,category,value,public_read,description)
VALUES('auth.turnstile.owner_override_v1','security','true'::jsonb,false,
 'Verified Supabase Auth CAPTCHA and Cloudflare sign-in widget must remain synchronized. Only Owner management API can change.')
ON CONFLICT(setting_key) DO NOTHING;
COMMIT;