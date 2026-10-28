-- Track enrollment in the canonical 30-day Boot Camp without moving or
-- duplicating its existing progress, lessons, assessments, or QA history.
alter table public.gu_bootcamp_academy_enrollments_v014168
 drop constraint gu_bootcamp_academy_enrollments_v014168_program_code_check;
alter table public.gu_bootcamp_academy_enrollments_v014168
 add constraint gu_bootcamp_academy_enrollments_v014168_program_code_check
 check (program_code in ('free5','truth5','watchlist7','scanners10',
  'foundations30','charts45','risk60','practicum90'));
create or replace function public.gu_foundations30_beta_enroll_v1(p_user uuid)
returns jsonb
language plpgsql security invoker set search_path=public,pg_temp
as $$
begin
 if p_user is null then raise exception 'Member identity required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':foundations30:enroll',0));
 insert into public.gu_bootcamp_academy_enrollments_v014168(user_id,program_code,program_version,status)
 values(p_user,'foundations30','0.14.0.168','active')
 on conflict(user_id,program_code) do update set status='active',updated_at=now();
 return jsonb_build_object('ok',true,'program','foundations30','enrollment','active',
  'graded',false,'competencyMasteryAwarded',false,'marketOutcomeClaimed',false);
end $$;
revoke all on function public.gu_foundations30_beta_enroll_v1(uuid) from public,anon,authenticated;
grant execute on function public.gu_foundations30_beta_enroll_v1(uuid) to service_role;
comment on function public.gu_foundations30_beta_enroll_v1(uuid)
 is 'Service-role-only enrollment for existing canonical 30-day program; reflections remain in the original program ledger.';
notify pgrst,'reload schema';
