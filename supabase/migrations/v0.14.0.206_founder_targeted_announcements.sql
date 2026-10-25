-- v0.14.0.206: Private targeted founding announcements; public site feeds must not expose these.
CREATE TABLE IF NOT EXISTS public.gu_founder_targeted_notices_v014206(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 notice_code text NOT NULL UNIQUE CHECK(notice_code ~ '^[A-Z0-9_-]{8,80}$'),
 title text NOT NULL CHECK(length(title) BETWEEN 10 AND 160),
 body text NOT NULL CHECK(length(body) BETWEEN 35 AND 2400),
 audience text NOT NULL CHECK(audience IN ('shared','council')),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','important')),
 publication_state text NOT NULL DEFAULT 'draft' CHECK(publication_state IN ('draft','published','withdrawn')),
 authored_by uuid NOT NULL REFERENCES auth.users(id),
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(publication_state<>'published' OR published_at IS NOT NULL)
);
ALTER TABLE public.gu_founder_targeted_notices_v014206 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_targeted_notices_v014206 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_founder_targeted_notices_v014206 TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_founder_targeted_notices_v014206 TO service_role;
DROP POLICY IF EXISTS gu_founder_notice_by_tier_v014206 ON public.gu_founder_targeted_notices_v014206;
CREATE POLICY gu_founder_notice_by_tier_v014206 ON public.gu_founder_targeted_notices_v014206
FOR SELECT TO authenticated USING(
 publication_state='published' AND published_at<=now() AND
 public.gu_founder_commons_access_v014174(audience)
);
