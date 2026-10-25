-- v0.14.0.174: additive unified Store face registry; no payment, entitlement or Stripe state change.
CREATE TABLE IF NOT EXISTS public.gu_storefront_items_v014174 (
 sku text PRIMARY KEY CHECK (sku ~ '^(plan|book|tool|course|founding|addon|feature):[A-Z0-9_-]{2,100}$'),
 category text NOT NULL CHECK (category IN ('membership','book','tool','bootcamp','founding','addon','feature')),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 160),
 description text NOT NULL DEFAULT '' CHECK (length(description)<=2400),
 price_label text NOT NULL DEFAULT 'Pricing to be announced' CHECK (length(price_label)<=90),
 duration_label text NOT NULL DEFAULT '' CHECK (length(duration_label)<=80),
 product_page text NOT NULL DEFAULT '' CHECK (product_page='' OR product_page ~ '^[A-Za-z0-9_-]+\.html$'),
 status text NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('in_development','coming_soon','ready_for_review','listed','for_sale','paused')),
 visible boolean NOT NULL DEFAULT true,
 sale_ready boolean NOT NULL DEFAULT false,
 display_order integer NOT NULL DEFAULT 100,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid NULL,
 CONSTRAINT gu174_no_unverified_sale CHECK (status <> 'for_sale' OR sale_ready = true)
);
ALTER TABLE public.gu_storefront_items_v014174 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_storefront_items_v014174 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gu_storefront_items_v014174 TO service_role;

-- This registry is a public storefront projection, not an entitlement or a payable Price ID.
-- Existing memberships: deprecated FOUNDING_MONTHLY/ANNUAL are not current Founding 600 offers.
INSERT INTO public.gu_storefront_items_v014174(sku,category,display_name,description,price_label,duration_label,product_page,status,visible,display_order)
SELECT 'plan:'||plan_code,'membership',name,COALESCE(description,''),
CASE WHEN plan_code='FREE' THEN 'Free' WHEN price_cents>0 THEN '$'||to_char(price_cents::numeric/100,'FM999,999,990.00') ELSE 'Pricing to be announced' END,
CASE billing_interval WHEN 'month' THEN 'Billed monthly' WHEN 'year' THEN 'Billed annually' WHEN 'lifetime' THEN 'One-time' ELSE '' END,
CASE plan_code WHEN 'FREE' THEN 'store-membership-free.html' WHEN 'FULL_MONTHLY' THEN 'store-membership-full-monthly.html' WHEN 'FULL_ANNUAL' THEN 'store-membership-full-annual.html' WHEN 'LIFETIME' THEN 'store-membership-lifetime.html' WHEN 'ONDEMAND_MONTHLY' THEN 'store-membership-ondemand-monthly.html' ELSE '' END,
'listed',true,COALESCE(sort_order,100)
FROM public.platform_plans WHERE plan_code IN ('FREE','FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY')
ON CONFLICT (sku) DO NOTHING;

-- All tools are publicly represented, even when existing catalog flags are not public.
INSERT INTO public.gu_storefront_items_v014174(sku,category,display_name,description,price_label,duration_label,product_page,status,visible,display_order)
SELECT 'tool:'||tool_code,'tool',name,COALESCE(description,''),
CASE WHEN status='live' AND individual_price_cents>0 THEN '$'||to_char(individual_price_cents::numeric/100,'FM999,999,990.00') ELSE 'Pricing to be announced' END,
CASE WHEN status='live' AND individual_price_cents>0 THEN 'Per month' ELSE '' END,
CASE tool_code WHEN 'INTERACTIVE_LEARNING' THEN 'store-tool-interactive-learning.html' WHEN 'JOURNAL_ANALYTICS' THEN 'store-tool-journal-analytics.html' WHEN 'MARKET_SIMULATOR' THEN 'store-tool-market-simulator.html' WHEN 'MARKET_TUTOR' THEN 'store-tool-market-tutor.html' ELSE '' END,
CASE WHEN status='live' THEN 'listed' ELSE 'coming_soon' END,true,COALESCE(sort_order,100)+200
FROM public.platform_tools WHERE status <> 'retired'
ON CONFLICT (sku) DO NOTHING;

-- All book and bundle definitions remain distinct; no direct-delivery entitlement inferred.
INSERT INTO public.gu_storefront_items_v014174(sku,category,display_name,description,price_label,product_page,status,visible,display_order)
SELECT 'book:'||product_code,'book',title,COALESCE(description,''),'See edition and retailer pricing',
CASE product_code WHEN 'FOUNDATION_BOOK_1' THEN 'store-book-foundation-1.html' WHEN 'FOUNDATION_BOOK_2' THEN 'store-book-foundation-2.html' WHEN 'FOUNDATION_BOOK_3' THEN 'store-book-foundation-3.html' WHEN 'DAY_TRADING_BOOK_1' THEN 'store-book-day-trading-1.html' WHEN 'READING_THE_TAPE' THEN 'store-book-reading-the-tape.html' ELSE '' END,
CASE WHEN sales_status='selling' THEN 'listed' ELSE 'coming_soon' END,true,COALESCE(sort_order,100)+400
FROM public.catalog_products
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.gu_storefront_items_v014174(sku,category,display_name,description,price_label,duration_label,status,visible,display_order)
SELECT 'course:'||code,'bootcamp',name,description,'Pricing to be announced',duration::text||' days','coming_soon',true,500+ord
FROM (VALUES
('BC-05-TRUTH','The Truth Behind the Ticker',5,'Source verification, original documents, claim classification and information timelines.',1),
('BC-07-WATCH','Build Your Own Stock Watchlist',7,'Research, qualify, reject and maintain rule-based stock watchlists.',2),
('BC-10-SCAN','Mastering Stock Scanners',10,'Explain scanner data, filtering, condition logic and reproducibility.',3),
('BC-30-CORE','30-Day Trading Boot Camp',30,'Foundational market mechanics, chart analysis, evidence and risk planning.',4),
('BC-45-CHART','Chart Reading and Trading Setups',45,'Read price structure, momentum and conditional technical setups.',5),
('BC-60-RISK','Risk, Execution, and Trading Discipline',60,'Risk planning, simulated execution, error prevention and review.',6),
('BC-90-PRACT','Advanced Simulated Trading Practicum',90,'Integrate research, independent decisions and documented simulation.',7),
('SC-07-CANDLE','Candlestick Mastery Clinic',7,'Candlestick structure, interval comparisons, wicks and uncertainty.',8),
('SC-10-TAPE','Level II and Time & Sales Interpretation Clinic',10,'Quotes, transaction prints, spread, depth and order-flow limitations.',9),
('SC-10-VWAP','VWAP and EMA Decision Clinic',10,'VWAP, moving averages, session definitions and conditional decisions.',10),
('SC-07-NEWS','News Catalysts and Market Reaction Clinic',7,'Catalyst origin, publication time and response evaluation.',11),
('SC-07-EDGAR','SEC Filings, Offerings and Dilution Clinic',7,'Filings, offerings, share supply and original-source verification.',12),
('SC-10-SIZING','Position Sizing and Capital Protection Clinic',10,'Planned risk, execution uncertainty and capital constraints.',13),
('SC-07-BREAK','Breakouts and Failed Breakouts Clinic',7,'Predeclared technical levels, confirmation and invalidation.',14),
('SC-07-JOURNAL','Trading Journal and Performance Analysis Clinic',7,'Journaling, evidence analysis and process feedback.',15)
) AS camp(code,name,duration,description,ord)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.gu_storefront_items_v014174(sku,category,display_name,description,price_label,duration_label,status,visible,display_order)
VALUES
('founding:FOUNDING_30','founding','Founding 600 — Standard 30 Days','30-day renewable Founding 600 educational membership; eligible 10% discount on qualifying separate first-party purchases, including Lifetime.','$49.99','Every 30 days','coming_soon',true,700),
('founding:FOUNDING_60','founding','Founding 600 — Extended 60 Days','60-day renewable premium Founding 600 educational membership; eligible 20% discount on qualifying separate first-party purchases, including Lifetime.','$59.99','Every 60 days','coming_soon',true,701),
('addon:SPARKS_10','addon','Crownlight Sparks — Starter (10)','10 optional practice-only reveal/skip credits. No official assessment score or independent mastery is awarded.','$3.99','One-time proposed price','coming_soon',true,800),
('addon:SPARKS_30','addon','Crownlight Sparks — Practice (30)','30 optional practice-only reveal/skip credits. Explanations and retries remain free.','$9.99','One-time proposed price','coming_soon',true,801),
('addon:SPARKS_75','addon','Crownlight Sparks — Extended Practice (75)','75 optional practice-only reveal/skip credits; grading and independent competency assessments remain unaffected.','$19.99','One-time proposed price','coming_soon',true,802)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.gu_storefront_items_v014174(sku,category,display_name,description,price_label,product_page,status,visible,display_order)
VALUES
('feature:GUIDED_HISTORICAL_LABS','feature','Guided Historical Labs & Replay Exercises','Reviewed historical chart practice and evidence-based decisions.','Not sold separately','labs.html','coming_soon',true,900),
('feature:SKILL_ASSESSMENTS','feature','Skill Assessments & Competency Review','Study, practice and independently assess stock-market competencies.','Not sold separately','assessments.html','coming_soon',true,901),
('feature:HISTORICAL_REPLAY_TRAINING','feature','Historical Replay Training','Independent book-aligned learning with separately authorized external replay software.','Not sold separately','ondemand-training.html','coming_soon',true,902),
('feature:LEARNING_PROGRESS','feature','Learning Progress & Skill Development','Curriculum and competency progress tracking.','Not sold separately','learn.html','coming_soon',true,903),
('feature:DATA_CONNECTIONS','feature','Optional Market Data Connections','Optional independent external market data integration.','Not sold separately','data-connections.html','coming_soon',true,904),
('feature:SAMPLE_INTERACTIVE_LABS','feature','Sample Interactive Labs','Preview selected learning exercises and examples.','Not sold separately','lab-samples.html','coming_soon',true,905)
ON CONFLICT (sku) DO NOTHING;

-- New book and tool records automatically receive storefront faces without making them sellable.
CREATE OR REPLACE FUNCTION public.gu174_autoface_book() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 INSERT INTO public.gu_storefront_items_v014174(sku,category,display_name,description,price_label,status,visible,display_order)
 VALUES ('book:'||NEW.product_code,'book',NEW.title,COALESCE(NEW.description,''),'See edition and retailer pricing','coming_soon',true,COALESCE(NEW.sort_order,100)+400)
 ON CONFLICT (sku) DO NOTHING;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.gu174_autoface_tool() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 INSERT INTO public.gu_storefront_items_v014174(sku,category,display_name,description,price_label,status,visible,display_order)
 VALUES ('tool:'||NEW.tool_code,'tool',NEW.name,COALESCE(NEW.description,''),'Pricing to be announced','coming_soon',true,COALESCE(NEW.sort_order,100)+200)
 ON CONFLICT (sku) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gu174_new_book_face ON public.catalog_products;
CREATE TRIGGER gu174_new_book_face AFTER INSERT ON public.catalog_products FOR EACH ROW EXECUTE FUNCTION public.gu174_autoface_book();
DROP TRIGGER IF EXISTS gu174_new_tool_face ON public.platform_tools;
CREATE TRIGGER gu174_new_tool_face AFTER INSERT ON public.platform_tools FOR EACH ROW EXECUTE FUNCTION public.gu174_autoface_tool();
REVOKE ALL ON FUNCTION public.gu174_autoface_book() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu174_autoface_tool() FROM PUBLIC,anon,authenticated;

COMMENT ON TABLE public.gu_storefront_items_v014174 IS 'Owner-controlled public product faces. No checkout or entitlements; for_sale demands independent server-approved sale_ready, which cannot be edited by catalog UI.';
