-- Crownlight Sparks V2: pass inventory and debit audit; no grants or billing.
CREATE TABLE IF NOT EXISTS public.gu_sparks_adfree_passes_v1 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_sparks_adfree_redemptions_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 sku text NOT NULL CHECK (sku IN ('ADFREE_DAY','ADFREE_WEEK','ADFREE_MONTH')),
 sparks_spent integer NOT NULL CHECK(sparks_spent IN (5,18,50)),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE TABLE IF NOT EXISTS public.gu_sparks_adfree_debits_v1 (
 redemption_id uuid NOT NULL REFERENCES public.gu_sparks_adfree_redemptions_v1(id) ON DELETE RESTRICT,
 bucket_id uuid NOT NULL REFERENCES public.groundup_question_pass_buckets(id) ON DELETE RESTRICT,
 amount integer NOT NULL CHECK(amount>0),
 PRIMARY KEY(redemption_id,bucket_id)
);
ALTER TABLE public.gu_sparks_adfree_passes_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_sparks_adfree_redemptions_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_sparks_adfree_debits_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_sparks_adfree_passes_v1,public.gu_sparks_adfree_redemptions_v1,public.gu_sparks_adfree_debits_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_sparks_adfree_passes_v1 TO service_role;
GRANT SELECT,INSERT ON public.gu_sparks_adfree_redemptions_v1,public.gu_sparks_adfree_debits_v1 TO service_role;
