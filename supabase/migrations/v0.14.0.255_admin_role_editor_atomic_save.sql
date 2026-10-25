-- v0.14.0.255 Owner-only atomic save for role metadata, permissions, and audit.
CREATE OR REPLACE FUNCTION public.v014255_admin_role_editor_save(p_actor uuid, p_role_code text, p_name text, p_description text, p_priority integer, p_is_assignable boolean, p_permissions text[], p_expected_permissions text[], p_expected_updated_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
 v_before public.admin_roles%rowtype;
 v_current text[]:=array[]::text[];
 v_target text[]:=array[]::text[];
 v_expect text[]:=array[]::text[];
 v_created boolean:=false;
 v_updated_at timestamptz;
begin
 if p_actor is null or p_role_code is null
    or p_role_code !~ '^[A-Z][A-Z0-9_]{1,79}$'
    or p_role_code in ('OWNER','SHOWCASE_VIEWER')
    or p_name is null or length(btrim(p_name)) not between 1 and 120
    or length(coalesce(p_description,''))>1000
    or p_priority is null or p_priority<1 or p_priority>9999
    or p_is_assignable is null
    or p_permissions is null or p_expected_permissions is null
    or cardinality(p_permissions)>100 or cardinality(p_expected_permissions)>100
 then raise exception 'Invalid protected role editor request.' using errcode='22023';end if;

 if not exists(
  select 1 from public.admin_user_roles ur
  join public.profiles pr on pr.id=ur.user_id
  where ur.user_id=p_actor and ur.role_code='OWNER'
    and (ur.expires_at is null or ur.expires_at>now())
    and pr.account_kind='member' and pr.deleted_at is null
 ) or exists(
  select 1 from public.admin_user_roles ur
  where ur.user_id=p_actor and ur.role_code='SHOWCASE_VIEWER'
    and (ur.expires_at is null or ur.expires_at>now())
 ) or exists(
  select 1 from public.admin_user_flags af
  where af.user_id=p_actor and af.status in ('suspended','restricted')
 ) then raise exception 'Active production OWNER authority required.' using errcode='42501'; end if;

 if exists(select 1 from unnest(p_permissions || p_expected_permissions) q(code)
           where q.code is null or btrim(q.code)='' or length(q.code)>128)
 then raise exception 'Invalid permission identifier.' using errcode='22023';end if;
 select coalesce(array_agg(distinct code order by code),array[]::text[])
 into v_target from unnest(p_permissions) q(code);
 select coalesce(array_agg(distinct code order by code),array[]::text[])
 into v_expect from unnest(p_expected_permissions) q(code);

 if exists(select 1 from unnest(v_target) q(code)
  where not exists(select 1 from public.admin_permissions ap where ap.permission_code=q.code))
 then raise exception 'Unknown permission identifier.' using errcode='22023';end if;
 if v_target && array['owner.manage','users.delete']::text[]
 then raise exception 'Owner-only privileges cannot be delegated through this editor.' using errcode='42501';end if;

 select * into v_before from public.admin_roles
 where role_code=p_role_code for update;
 if found then
  if p_expected_updated_at is null or v_before.updated_at is distinct from p_expected_updated_at
  then raise exception 'Role changed since this editor loaded. Refresh before saving.' using errcode='40001';end if;
 else
  if p_expected_updated_at is not null or cardinality(v_expect)<>0
  then raise exception 'Role changed since this editor loaded. Refresh before saving.' using errcode='40001';end if;
  v_created:=true;
 end if;

 select coalesce(array_agg(permission_code order by permission_code),array[]::text[])
 into v_current from public.admin_role_permissions where role_code=p_role_code;
 if v_current is distinct from v_expect
 then raise exception 'Role permissions changed since this editor loaded. Refresh before saving.' using errcode='40001';end if;
 if v_created then
  insert into public.admin_roles(role_code,name,description,priority,is_system,is_assignable,updated_at)
  values(p_role_code,btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),p_priority,false,p_is_assignable,now())
  returning updated_at into v_updated_at;
 else
  update public.admin_roles set name=btrim(p_name),
    description=nullif(btrim(coalesce(p_description,'')),''),
    priority=p_priority,is_assignable=p_is_assignable,updated_at=now()
  where role_code=p_role_code returning updated_at into v_updated_at;
 end if;

 insert into public.admin_role_permissions(role_code,permission_code)
 select p_role_code,code from unnest(v_target) q(code)
 on conflict (role_code,permission_code) do nothing;
 delete from public.admin_role_permissions
 where role_code=p_role_code and not (permission_code=any(v_target));

 insert into public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 values(p_actor,'role.editor.atomic.save','role',p_role_code,
  jsonb_build_object('created',v_created,'before_count',cardinality(v_current),
    'after_count',cardinality(v_target),'atomic',true));
 return jsonb_build_object('ok',true,'role_code',p_role_code,'created',v_created,
   'permission_count',cardinality(v_target),'updated_at',v_updated_at);
end;
$function$
REVOKE ALL ON FUNCTION public.v014255_admin_role_editor_save(uuid,text,text,text,integer,boolean,text[],text[],timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v014255_admin_role_editor_save(uuid,text,text,text,integer,boolean,text[],text[],timestamptz) TO service_role;
