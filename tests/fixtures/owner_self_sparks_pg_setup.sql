-- Disposable Sparks QA only. Synthetic profiles and OWNER role; never production.
CREATE TABLE public.profiles(
 id uuid PRIMARY KEY REFERENCES auth.users(id),
 account_kind text NOT NULL DEFAULT 'member',
 deleted_at timestamptz
);
CREATE TABLE public.admin_user_roles(
 user_id uuid NOT NULL REFERENCES auth.users(id),
 role_code text NOT NULL,
 expires_at timestamptz,
 PRIMARY KEY(user_id,role_code)
);
CREATE TABLE public.admin_user_flags(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'active'
);
INSERT INTO public.profiles(id,account_kind) VALUES
 ('11111111-1111-4111-8111-111111111111','member'),
 ('22222222-2222-4222-8222-222222222222','member');
INSERT INTO public.admin_user_roles(user_id,role_code,expires_at)
 VALUES('22222222-2222-4222-8222-222222222222','OWNER',NULL);
