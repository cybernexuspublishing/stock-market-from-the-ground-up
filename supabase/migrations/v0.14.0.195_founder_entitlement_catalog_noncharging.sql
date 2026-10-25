-- v0.14.0.195 Founder product-to-entitlement catalog contract.
-- Do not change the eight existing public prices, product rows or Stripe payment gates.
-- Recurring cadence is 30/60 *days*, not months; metadata and Stripe Price establish it.
INSERT INTO public.platform_plans(
plan_code,name,description,price_cents,currency,billing_interval,active,public_visible,
ad_free,includes_all_tools,includes_all_books,checkout_enabled,sort_order,metadata)
VALUES
('FOUNDING_30','Founding 600 Standard','Original 600-seat educational platform subscription: recurring every 30 days.',4999,'USD','none',true,false,false,true,false,false,970,
 '{"founder":true,"term_days":30,"stripe_interval":"day","stripe_interval_count":30,"signup_enabled":false}'::jsonb),
('FOUNDING_60','Founding 600 Extended','Original 600-seat educational platform subscription: recurring every 60 days.',5999,'USD','none',true,false,false,true,false,false,980,
 '{"founder":true,"term_days":60,"stripe_interval":"day","stripe_interval_count":60,"signup_enabled":false}'::jsonb)
ON CONFLICT(plan_code) DO NOTHING;
DO $verify$ BEGIN
IF EXISTS(SELECT 1 FROM public.platform_plans p JOIN public.gu_founder_plans_v014173 f USING(plan_code)
 WHERE p.price_cents<>f.price_cents OR p.public_visible=true OR p.checkout_enabled=true
 OR p.includes_all_tools=false OR p.includes_all_books=true)
THEN RAISE EXCEPTION 'Founding catalog approval mismatch, no changes accepted';END IF;
END $verify$;
