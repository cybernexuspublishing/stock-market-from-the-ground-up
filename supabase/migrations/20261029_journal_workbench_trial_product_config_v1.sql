-- Stage eligibility ONLY for Free/Paid Journal and existing Watchlist Workbench.
-- Legacy entitlement remains the authority. No prices, grants, trials or checkouts created.
BEGIN;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.gu_product_access_config_v1
     WHERE product_code IN ('JOURNAL_ANALYTICS','WATCHLIST_WORKBENCH')
       AND policy_mode='legacy' AND version=1)=2 THEN NULL;
 ELSE RAISE EXCEPTION 'Shared product access policy already changed. Reconcile before updating.'; END IF;
END $verify$;
UPDATE public.gu_product_access_config_v1
SET trial_access=true,paid_access=true,purchase_durations=ARRAY[1,7,14,30,180]::integer[],
    access_expiration_policy='fixed_term',version=version+1,updated_at=now()
WHERE product_code IN ('JOURNAL_ANALYTICS','WATCHLIST_WORKBENCH')
 AND policy_mode='legacy' AND version=1;
COMMIT;