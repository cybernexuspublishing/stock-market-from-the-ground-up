-- Remove the temporary outbound HTTP transport after 7/7 QA identities
-- have been created. The one-use secret has been consumed, the Edge Function
-- has been retired, and the immutable DB result plus per-account audit remain.
do $$
begin
 if exists(select 1 from net.http_request_queue) then
   raise exception 'Cannot remove pg_net with pending outbound requests';
 end if;
 if not exists(select 1 from public.qa_provision_once_20261026
  where id='c11e9a5c-881f-4292-9654-d63ab47a3424'::uuid
    and status='complete' and (summary->>'count')::integer=7) then
   raise exception 'QA provisioning completion not verified';
 end if;
end $$;
drop extension if exists pg_net;
drop schema if exists net;
