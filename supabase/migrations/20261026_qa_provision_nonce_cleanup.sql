-- Remove one-use nonce table after reconciling exactly seven QA Auth users and
-- seven distinct administrative audit records. The auth users, staff roles,
-- and permanent audit history are NOT changed by this cleanup.
do $$
declare n_users int; n_audit int; n_completed int;
begin
 select count(*) into n_users from auth.users
 where raw_app_meta_data->>'qa_batch'='SMFGU-QA-7-20261026';
 select count(distinct target_id) into n_audit from public.admin_audit_log
 where action='qa.noncommercial_account_provisioned'
 and details->>'qa_batch'='SMFGU-QA-7-20261026';
 select count(*) into n_completed from public.qa_provision_once_20261026
 where status='complete' and (summary->>'count')::int=7;
 if n_users<>7 or n_audit<>7 or n_completed<>1 then
  raise exception 'QA evidence mismatch: users %, audit %, batches %',n_users,n_audit,n_completed;
 end if;
end $$;
drop table public.qa_provision_once_20261026;
