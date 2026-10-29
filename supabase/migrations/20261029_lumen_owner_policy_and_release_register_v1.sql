-- Owner-managed prospective Lumen unit value, custom SKU costs, audited roadmap.
-- No member cash/payment action, no mixed checkout activation, no changed active value.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_lumen_value_settings_v1(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 active_cents integer NOT NULL DEFAULT 7 CHECK(active_cents BETWEEN 1 AND 100),
 proposed_cents integer NOT NULL DEFAULT 7 CHECK(proposed_cents BETWEEN 1 AND 100),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 mixed_checkout_enabled boolean NOT NULL DEFAULT false,
 value_activation_state text NOT NULL DEFAULT 'staged' CHECK(value_activation_state IN ('staged','review_required')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid
);
INSERT INTO public.gu_lumen_value_settings_v1(singleton,active_cents,proposed_cents)
VALUES(true,7,7) ON CONFLICT(singleton) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.gu_lumen_value_audit_v1(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 old_cents integer NOT NULL,new_cents integer NOT NULL,
 old_proposed_cents integer NOT NULL,new_proposed_cents integer NOT NULL,
 actor uuid,changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_lumen_value_settings_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_value_audit_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lumen_value_settings_v1,public.gu_lumen_value_audit_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.gu_lumen_value_settings_v1 TO service_role;
GRANT SELECT,INSERT ON public.gu_lumen_value_audit_v1 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_lumen_value_audit_trigger_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $fn$
BEGIN
 IF NEW.active_cents <> OLD.active_cents OR NEW.mixed_checkout_enabled <> OLD.mixed_checkout_enabled
 THEN RAISE EXCEPTION 'Active valuation and mixed checkout can only change via independently verified release migration';END IF;
 IF NEW.proposed_cents<>OLD.proposed_cents THEN
  IF NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Lumen value revision mismatch';END IF;
  NEW.value_activation_state='review_required';
  INSERT INTO public.gu_lumen_value_audit_v1(old_cents,new_cents,old_proposed_cents,new_proposed_cents,actor)
  VALUES(OLD.active_cents,NEW.active_cents,OLD.proposed_cents,NEW.proposed_cents,NEW.updated_by);
 END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gu_lumen_value_guard_v1 ON public.gu_lumen_value_settings_v1;
CREATE TRIGGER gu_lumen_value_guard_v1 BEFORE UPDATE ON public.gu_lumen_value_settings_v1
FOR EACH ROW EXECUTE FUNCTION public.gu_lumen_value_audit_trigger_v1();
REVOKE ALL ON FUNCTION public.gu_lumen_value_audit_trigger_v1() FROM PUBLIC,anon,authenticated;

ALTER TABLE public.gu_lumen_tool_offers_v1
 ADD COLUMN IF NOT EXISTS custom_lumens_cost integer
 CHECK(custom_lumens_cost BETWEEN 1 AND 10000000);
ALTER TABLE public.gu_lumen_tool_offers_v1
 ADD COLUMN IF NOT EXISTS redemption_lumens_cost integer
 GENERATED ALWAYS AS (
 CASE WHEN custom_lumens_cost IS NOT NULL THEN custom_lumens_cost
 ELSE (price_cents+6)/7 END
 ) STORED;
-- Existing offers have no price and remain draft. Preserve old lumens_cost for compatibility.
DO $replace$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO definition
 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='gu_lumen_tool_redeem_v1'
 AND pg_get_function_identity_arguments(oid)='p_user_id uuid, p_offer_code text, p_request_id uuid, p_expected_cost integer';
 IF definition IS NULL OR strpos(definition,'v_offer.lumens_cost')=0
 THEN RAISE EXCEPTION 'Unexpected tool redemption contract; manual review required';END IF;
 definition:=replace(definition,'v_offer.lumens_cost','v_offer.redemption_lumens_cost');
 EXECUTE definition;
END $replace$;

CREATE TABLE IF NOT EXISTS public.gu_release_acceptance_v1(
 code text PRIMARY KEY CHECK(code ~ '^[A-Z][A-Z0-9_]{3,79}$'),
 area text NOT NULL,
 title text NOT NULL,
 phase text NOT NULL DEFAULT 'research' CHECK(phase IN
 ('research','draft','started','implemented','beta_candidate','beta_testing','retail_review','retail_accepted')),
 gates jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(gates)='object'),
 required_gates text[] NOT NULL DEFAULT ARRAY[
 'source_review','github_ci','cloudflare_deploy','supabase_auth','member_browser',
 'stripe_test','stripe_live','checkout_fulfillment','rights','owner_signoff']::text[],
 verified_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 next_action text NOT NULL DEFAULT '',
 source_path text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 accepted_at timestamptz,
 CHECK(phase<>'retail_accepted' OR accepted_at IS NOT NULL)
);
ALTER TABLE public.gu_release_acceptance_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_release_acceptance_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_release_acceptance_v1 TO service_role;
-- Append-only record of stage changes; users have no table privileges.
CREATE TABLE IF NOT EXISTS public.gu_release_acceptance_history_v1(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 code text NOT NULL REFERENCES public.gu_release_acceptance_v1(code),
 old_phase text,new_phase text NOT NULL,
 old_gates jsonb NOT NULL,new_gates jsonb NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_release_acceptance_history_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_release_acceptance_history_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_release_acceptance_history_v1 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_release_acceptance_history_trigger_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $fn$
BEGIN
 INSERT INTO public.gu_release_acceptance_history_v1(code,old_phase,new_phase,old_gates,new_gates)
 VALUES(NEW.code,OLD.phase,NEW.phase,OLD.gates,NEW.gates);
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gu_release_acceptance_history_update_v1 ON public.gu_release_acceptance_v1;
CREATE TRIGGER gu_release_acceptance_history_update_v1 AFTER UPDATE
 ON public.gu_release_acceptance_v1 FOR EACH ROW
 EXECUTE FUNCTION public.gu_release_acceptance_history_trigger_v1();
REVOKE ALL ON FUNCTION public.gu_release_acceptance_history_trigger_v1() FROM PUBLIC,anon,authenticated;

INSERT INTO public.gu_release_acceptance_v1(code,area,title,phase,required_gates,next_action,source_path) VALUES
('FREE_JOURNAL','Journal','Free Trading Journal','implemented',
 ARRAY['source_review','github_ci','cloudflare_deploy','supabase_auth','member_browser','owner_signoff'],
 'Verify authenticated Free weekly quota, no-trade record, saved-plan import and journal history.','journal.html'),
('PAID_JOURNAL','Journal','Paid Journal Analytics','implemented',DEFAULT,
 'Validate paid entitlements, private analytics, no double charging, TEST and LIVE store acceptance.','journal-analytics.html'),
('ADVANCED_TRADE_PLAN','Trade planning','Advanced Trade-Plan Builder — standalone/add-on','implemented',DEFAULT,
 'Isolate standalone entitlement, complete plan/actual and scale-out acceptance, approve independent SKU/price.','assets/js/advanced-trade-plan-v1.js'),
('FREE_WATCHLIST','Watchlists','Free Research Watchlist','started',
 ARRAY['source_review','github_ci','cloudflare_deploy','supabase_auth','member_browser','rights','owner_signoff'],
 'Verify 20-symbol Free limit, catalyst evidence and member ownership.',''),
('ADVANCED_WORKBENCH','Watchlists','Advanced Watchlist & Trade-Plan Workbench','implemented',DEFAULT,
 'Test saved private plans, strategy templates, independent workflow sections and entitlement purchases.','advanced-tool.html'),
('RESEARCH_SCANNERS','Research','Scanner research and filters','draft',DEFAULT,
 'Validate source-derived scanner conditions against authorized historical data; no win-probability claims.',''),
('CATALYST_RESEARCH','Research','Catalysts, filings, earnings and corporate actions','draft',DEFAULT,
 'Acquire permitted sources and enforce publication timestamps, identity and reliability indicators.',''),
('CATALYST_CHART_TIMELINE','Research','Catalyst-to-chart no-lookahead timeline','draft',DEFAULT,
 'Obtain approved source bars/events; verify point-in-time visibility in replay.',''),
('ECHARTS_REPORTS','Analytics','ECharts Watchlist Intelligence reports','started',
 ARRAY['source_review','github_ci','cloudflare_deploy','supabase_auth','member_browser','rights','owner_signoff'],
 'Verify 20+ metrics, denominators, missingness and zero future-data leakage.',''),
('CHART_STUDIO_STANDARD','Chart Studio','Standard Studio','implemented',DEFAULT,
 'Authenticated multi-member acceptance, provider provenance, Talia instructions and saved layout.',''),
('CHART_STUDIO_ADVANCED','Chart Studio','Advanced Studio','implemented',DEFAULT,
 'Verify advanced indicators, layouts, drawings, data sources and pass entitlements.',''),
('CHART_STUDIO_PRO','Chart Studio','Professional Studio','implemented',DEFAULT,
 'Verify synced multi-charts, save/restore RLS, owner override and replay sources.',''),
('JOURNAL_REPLAY','Journal','Historical replay-to-journal pipeline','started',DEFAULT,
 'Test member-only snapshots, actual authorized candles and protected record links.',''),
('HISTORICAL_MARKET_DATA','Historical data','Licensed historical candle publication','research',DEFAULT,
 'Complete provider display rights, source provenance, historical-data registry and browser replay.',''),
('LABS_419','Learning','419 Labs registry and research integrations','started',DEFAULT,
 'Map Lab objectives to new watchlist/tape/risk research with private answer keys and editorial QA.',''),
('TALIA_TUTOR','Learning','Market Tutor and eight-stage research coaching','started',DEFAULT,
 'Review Talia instruction, six-Lab question editorial and authenticated student sessions.',''),
('BOOTCAMP_ACADEMY','Learning','Boot Camp Academy and Free Foundations','started',DEFAULT,
 'Correct navigation, verify B01 and stock research exercises, member gating and 5–90 day sequences.',''),
('SKILLS_DASHBOARD','Learning','Skills Dashboard decision/research scores','draft',DEFAULT,
 'Separate research completeness from protected mastery grades; verify denominators.',''),
('TRAINING_EDITOR','Learning','Training Editor research lessons and diagnostic assessment','started',DEFAULT,
 'Integrate authored research source cards, review rights and protected approval.',''),
('MARKET_COMMONS','Community','Market Commons educational research sharing','started',DEFAULT,
 'Verify source redaction, permissions, moderation and Founder Commons restrictions.',''),
('ADMIN_ANALYTICS','Admin','Admin research and learning effectiveness dashboards','draft',DEFAULT,
 'Implement privacy-safe member aggregates and review denominator/sampling.',''),
('LUMEN_STORE','Commerce','Crownlight Lumen rewards store','implemented',DEFAULT,
 'Test passes, original wallet, refund semantics, and Owner pricing controls in live member sessions.','lumen-store.html'),
('LUMEN_MIXED_CHECKOUT','Commerce','Selectable Lumen + cash checkout','started',DEFAULT,
 'Finish TEST signed payment/webhook fulfillment, wallet reserve/release, 100% Lumen-only and LIVE acceptance.','checkout.html'),
('LUMEN_GLOBAL_VALUATION','Commerce','Owner-editable Lumen value and policy','started',DEFAULT,
 'Review legal/store/checkout migration compatibility before publishing a new active cents-per-Lumen rate.',''),
('LUMEN_PRODUCT_PRICES','Commerce','Per-item Owner Lumen price overrides','started',DEFAULT,
 'Validate custom price against server-issued offer, entitlements and RLS, keep drafts hidden.',''),
('FOUNDERS_MEMBERSHIPS','Commerce','Founding Members 14/30/60-day checkout','started',DEFAULT,
 'Verify full lifecycle in Stripe TEST and LIVE without real paid charge; check existing member inclusion.',''),
('DIGITAL_BOOK_DOWNLOADS','Books','Purchased/Owner downloadable ebooks','started',DEFAULT,
 'Verify book grants, KDP restrictions, rights, signed downloads, correct member shelf.',''),
('STORE_PRICING_SYNC','Commerce','Store product, Cloudflare, Supabase, Stripe parity','started',DEFAULT,
 'Verify authoritative amounts and renewal terms across DB, Workers, TEST and LIVE Stripe.','')
ON CONFLICT(code) DO NOTHING;
COMMIT;