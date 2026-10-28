-- SMFGU Journal evidence V1: private screenshots with ownership and documented provenance.
-- Additive migration. No Journal, plan, commerce or member records are modified.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('gu-journal-evidence','gu-journal-evidence',false,5242880,
       array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,
  allowed_mime_types=array['image/png','image/jpeg','image/webp'];

create table if not exists public.journal_evidence_v1 (
 id uuid primary key default gen_random_uuid(),
 journal_id bigint not null references public.decision_journal(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 object_key text not null unique,
 stage text not null check(stage in ('plan','entry','exit','review')),
 description text not null default '' check(char_length(description)<=500),
 source_time timestamptz,
 self_reported_before_decision boolean not null default false,
 created_at timestamptz not null default now(),
 constraint journal_evidence_key_shape_v1 check(
   split_part(object_key,'/',1)=user_id::text and
   split_part(object_key,'/',2)=journal_id::text and
   object_key ~ ('^'||user_id::text||'/'||journal_id::text||'/[0-9a-f-]{36}\\.(png|jpg|jpeg|webp)$')
 )
);
create index if not exists journal_evidence_v1_owner_idx on public.journal_evidence_v1(user_id,journal_id,created_at desc);
alter table public.journal_evidence_v1 enable row level security;
revoke all on public.journal_evidence_v1 from public,anon,authenticated;
grant select,insert,delete on public.journal_evidence_v1 to authenticated;

drop policy if exists journal_evidence_v1_read_own on public.journal_evidence_v1;
create policy journal_evidence_v1_read_own on public.journal_evidence_v1
 for select to authenticated using((select auth.uid())=user_id and
   exists(select 1 from public.decision_journal j
     where j.id=journal_id and j.user_id=(select auth.uid())));
drop policy if exists journal_evidence_v1_insert_own on public.journal_evidence_v1;
create policy journal_evidence_v1_insert_own on public.journal_evidence_v1
 for insert to authenticated with check((select auth.uid())=user_id and
   exists(select 1 from public.decision_journal j
     where j.id=journal_id and j.user_id=(select auth.uid())) and
   (select count(*) from public.journal_evidence_v1 e
      where e.journal_id=journal_id and e.user_id=(select auth.uid()))<6);
drop policy if exists journal_evidence_v1_delete_own on public.journal_evidence_v1;
create policy journal_evidence_v1_delete_own on public.journal_evidence_v1
 for delete to authenticated using((select auth.uid())=user_id and
   exists(select 1 from public.decision_journal j
     where j.id=journal_id and j.user_id=(select auth.uid())));

-- Storage paths use user_uuid/journal_id/random_uuid.ext. Never expose a public bucket.
-- Restrict storage writes and reads to an existing journal owned by the caller.
drop policy if exists gu_journal_evidence_select_v1 on storage.objects;
create policy gu_journal_evidence_select_v1 on storage.objects
 for select to authenticated using(
 bucket_id='gu-journal-evidence'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.decision_journal j
  where j.user_id=(select auth.uid()) and j.id::text=(storage.foldername(name))[2])
);
drop policy if exists gu_journal_evidence_insert_v1 on storage.objects;
create policy gu_journal_evidence_insert_v1 on storage.objects
 for insert to authenticated with check(
 bucket_id='gu-journal-evidence'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.decision_journal j
  where j.user_id=(select auth.uid()) and j.id::text=(storage.foldername(name))[2])
);
drop policy if exists gu_journal_evidence_delete_v1 on storage.objects;
create policy gu_journal_evidence_delete_v1 on storage.objects
 for delete to authenticated using(
 bucket_id='gu-journal-evidence'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.decision_journal j
  where j.user_id=(select auth.uid()) and j.id::text=(storage.foldername(name))[2])
);
