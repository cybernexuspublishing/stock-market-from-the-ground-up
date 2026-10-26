-- Owner expense ledger to accompany reconciled order reports.
-- This is an operational cost record, not a replacement for payment provider truth.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_store_expenses_v014302 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 expense_date date NOT NULL,
 category text NOT NULL CHECK(length(trim(category)) BETWEEN 2 AND 90),
 description text NOT NULL CHECK(length(trim(description)) BETWEEN 3 AND 300),
 vendor text NOT NULL DEFAULT '' CHECK(length(vendor)<=180),
 amount_cents bigint NOT NULL CHECK(amount_cents>0 AND amount_cents<=10000000000),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 state text NOT NULL DEFAULT 'posted' CHECK(state IN('posted','void')),
 void_reason text NOT NULL DEFAULT '',
 created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gu_store_expenses_date_v014302 ON public.gu_store_expenses_v014302(expense_date,state,category);
ALTER TABLE public.gu_store_expenses_v014302 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_store_expenses_v014302 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_store_expenses_v014302 TO authenticated,service_role;
CREATE POLICY gu_store_expenses_owner_v014302 ON public.gu_store_expenses_v014302
 FOR ALL TO authenticated
 USING(public.gu_store_owner_v014297())
 WITH CHECK(public.gu_store_owner_v014297());
CREATE OR REPLACE FUNCTION public.gu_store_expense_audit_v014302()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF NOT public.gu_store_owner_v014297() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.created_by IS DISTINCT FROM actor OR NEW.state<>'posted' OR NEW.void_reason<>'' THEN
   RAISE EXCEPTION 'Only a valid Owner posted expense can be created'; END IF;
 ELSIF TG_OP='UPDATE' THEN
  IF OLD.state<>'posted' OR NEW.state<>'void' OR length(trim(NEW.void_reason))<8 OR
    OLD.amount_cents<>NEW.amount_cents OR OLD.currency<>NEW.currency OR
    OLD.expense_date<>NEW.expense_date OR OLD.category<>NEW.category OR
    OLD.description<>NEW.description OR OLD.vendor<>NEW.vendor OR OLD.created_by<>NEW.created_by
  THEN RAISE EXCEPTION 'Expenses are immutable; void with a reason and record a new entry'; END IF;
  NEW.updated_at=now();
 END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.store_expense.'||lower(TG_OP),'store_expense',NEW.id::text,
  jsonb_build_object('amount_cents',NEW.amount_cents,'currency',NEW.currency,'category',NEW.category,
   'expense_date',NEW.expense_date,'state',NEW.state,'void_reason',NEW.void_reason));
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gu_store_expense_owner_audit_v014302 ON public.gu_store_expenses_v014302;
CREATE TRIGGER gu_store_expense_owner_audit_v014302 BEFORE INSERT OR UPDATE
 ON public.gu_store_expenses_v014302 FOR EACH ROW EXECUTE FUNCTION public.gu_store_expense_audit_v014302();
COMMIT;