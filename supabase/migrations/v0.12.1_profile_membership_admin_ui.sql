-- v0.12.1 CUMULATIVE: v0.12 Market Commons/navigation/content controls + Profile/Membership/Admin/Auth UX
-- Run after the currently deployed v0.11.3 navigation/admin hotfix. Do not run the undeployed v0.12 migration separately.

-- ============================================================
-- PLAN-SPECIFIC ADVERTISING POLICY
-- Full Monthly / Annual now permit limited sponsor placements.
-- Lifetime and OWNER remain ad-free.
-- ============================================================
update public.platform_plans
set ad_free=false,
    description='All released first-party learning, journal, simulator, Tutor, research, execution, tape, and analytics tools. Limited sponsor placements may appear outside decision-critical training workflows.',
    updated_at=now()
where plan_code='FULL_MONTHLY';

update public.platform_plans
set ad_free=false,
    description='Everything in the Monthly Membership with annual billing. Minimal sponsor placements may appear outside decision-critical training workflows.',
    updated_at=now()
where plan_code='FULL_ANNUAL';

update public.platform_plans
set ad_free=true, updated_at=now()
where plan_code='LIFETIME';

create table if not exists public.plan_ad_policies (
  access_code text primary key,
  label text not null,
  ads_enabled boolean not null default true,
  max_impressions_per_session integer not null default 1 check(max_impressions_per_session>=0),
  max_impressions_per_24h integer not null default 2 check(max_impressions_per_24h>=0),
  minimum_minutes_between_ads integer not null default 10 check(minimum_minutes_between_ads>=0),
  allowed_slots text[] not null default array['HOME_INLINE','STORE_INLINE','COMMUNITY_INLINE','FREE_DASHBOARD','SAMPLE_LABS']::text[],
  notes text,
  updated_at timestamptz not null default now()
);

insert into public.plan_ad_policies(access_code,label,ads_enabled,max_impressions_per_session,max_impressions_per_24h,minimum_minutes_between_ads,notes) values
('SIGNED_OUT','Signed-out visitor',true,3,6,5,'Public traffic may receive standard sponsor inventory.'),
('FREE','Free Membership',true,3,6,5,'Free accounts may receive standard sponsor inventory.'),
('A_LA_CARTE','Pick What You Want Membership (legacy)',true,2,4,10,'Tool-pass members may receive reduced sponsor inventory.'),
('BOOK_TRIAL','Trial Membership',true,1,2,15,'Book-trial members receive limited sponsor inventory.'),
('FULL_MONTHLY','Monthly Membership',true,1,2,30,'Limited sponsor inventory only; never inside decision-critical tools.'),
('FULL_ANNUAL','Annual Membership',true,1,1,60,'Minimal sponsor inventory only; never inside decision-critical tools.'),
('LIFETIME','Lifetime Membership',false,0,0,0,'Ad-free.'),
('OWNER','OWNER / Super Admin',false,0,0,0,'Ad-free administrative account.')
on conflict(access_code) do update set
 label=excluded.label,ads_enabled=excluded.ads_enabled,max_impressions_per_session=excluded.max_impressions_per_session,
 max_impressions_per_24h=excluded.max_impressions_per_24h,minimum_minutes_between_ads=excluded.minimum_minutes_between_ads,
 allowed_slots=excluded.allowed_slots,notes=excluded.notes,updated_at=now();

alter table public.plan_ad_policies enable row level security;
drop policy if exists "public reads ad policies" on public.plan_ad_policies;
create policy "public reads ad policies" on public.plan_ad_policies for select to anon,authenticated using(true);
revoke all on public.plan_ad_policies from anon,authenticated;
grant select on public.plan_ad_policies to anon,authenticated;
grant all on public.plan_ad_policies to service_role;

alter table public.ad_events add column if not exists session_token text;
alter table public.ad_events add column if not exists access_code text;
create index if not exists ad_events_user_time_idx on public.ad_events(user_id,created_at desc);
create index if not exists ad_events_session_time_idx on public.ad_events(session_token,created_at desc);

-- Existing campaigns become eligible for the limited Full-plan inventory unless
-- an administrator later narrows the audience in the Advertising Center.
update public.ad_campaigns
set audience = coalesce(audience,'{}'::jsonb) || '{"full":true}'::jsonb
where audience is null or not (audience ? 'full');

update public.ad_placements
set description='Clearly labeled sponsor block outside member posts and decision-critical learning workflows.',
    free_only=false
where placement_code='COMMUNITY_INLINE';
update public.ad_placements set free_only=false where placement_code in ('HOME_INLINE','STORE_INLINE','FREE_DASHBOARD');
update public.ad_placements
set name='Dashboard — Sponsor',
    description='Clearly labeled sponsor block on the member dashboard. Frequency is controlled by membership policy; Lifetime and OWNER remain ad-free.'
where placement_code='FREE_DASHBOARD';

-- ============================================================
-- LAB VISIBILITY / SUPPLEMENTAL LAB CATALOG
-- Existing static labs require no row until an override is needed.
-- Supplemental labs may be added through Admin with an explicit destination URL.
-- ============================================================
create table if not exists public.platform_labs (
  lab_id text primary key,
  title text,
  book_code text,
  chapter_number integer,
  ticker text,
  historical_date date,
  timeframe text,
  lab_type text not null default 'core' check(lab_type in ('core','supplemental')),
  active boolean not null default true,
  registry_visible boolean not null default true,
  public_sample boolean not null default false,
  custom_href text,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists platform_labs_visibility_idx on public.platform_labs(active,registry_visible,sort_order);
alter table public.platform_labs enable row level security;
drop policy if exists "public reads lab controls" on public.platform_labs;
create policy "public reads lab controls" on public.platform_labs for select to anon,authenticated using(true);
revoke all on public.platform_labs from anon,authenticated;
grant select on public.platform_labs to anon,authenticated;
grant all on public.platform_labs to service_role;

-- Keep the three current public samples explicitly registered.
insert into public.platform_labs(lab_id,lab_type,active,registry_visible,public_sample,sort_order) values
('F1-C02-L01','core',true,true,true,10),
('F2-C01-L01','core',true,true,true,20),
('F3-C01-L01','core',true,true,true,30)
on conflict(lab_id) do update set public_sample=excluded.public_sample,active=true,registry_visible=true;

-- ============================================================
-- ADMIN-MANAGED NAVIGATION
-- v0.12 uses a compact Learn / Tools / Market Commons / Store model.
-- Admins can disable or add child links without editing GitHub.
-- ============================================================
create table if not exists public.site_navigation_items (
  item_code text primary key,
  label text not null,
  href text,
  menu_group text not null check(menu_group in ('learn','trade','research','top','profile')),
  tool_code text,
  auth_mode text not null default 'any' check(auth_mode in ('any','signed_in','signed_out')),
  active boolean not null default true,
  public_visible boolean not null default true,
  sort_order integer not null default 100,
  style_variant text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_navigation_items enable row level security;
drop policy if exists "public reads active navigation" on public.site_navigation_items;
create policy "public reads active navigation" on public.site_navigation_items for select to anon,authenticated using(active=true and public_visible=true);
revoke all on public.site_navigation_items from anon,authenticated;
grant select on public.site_navigation_items to anon,authenticated;
grant all on public.site_navigation_items to service_role;

insert into public.site_navigation_items(item_code,label,href,menu_group,tool_code,auth_mode,active,public_visible,sort_order,style_variant) values
('LEARN_SYSTEM','Learning System','learn.html','learn','INTERACTIVE_LEARNING','any',true,true,10,null),
('LEARN_LABS','Lab Registry','labs.html','learn','INTERACTIVE_LEARNING','signed_in',true,true,20,null),
('LEARN_SAMPLES','Try Sample Labs','lab-samples.html','learn',null,'signed_out',true,true,25,null),
('LEARN_TUTOR','Market Tutor','market-tutor.html','learn','MARKET_TUTOR','any',true,true,30,null),
('LEARN_SKILLS','Market Skills Record','skills.html','learn','INTERACTIVE_LEARNING','signed_in',true,true,40,null),
('LEARN_ALL','All Learning Tools','tools.html#learn','learn',null,'any',true,true,90,null),
('TRADE_SIM','Market Simulator','simulator.html','trade','MARKET_SIMULATOR','any',true,true,10,null),
('TRADE_JOURNAL','Trading Journal','journal.html','trade','JOURNAL_ANALYTICS','signed_in',true,true,20,null),
('TRADE_TAPE','Order Flow & Tape Lab','advanced-tool.html?tool=ORDER_FLOW_TAPE_LAB','trade','ORDER_FLOW_TAPE_LAB','signed_in',true,true,30,null),
('TRADE_RISK','Risk & Position Sizing','advanced-tool.html?tool=RISK_POSITION_LAB','trade','RISK_POSITION_LAB','signed_in',true,true,40,null),
('TRADE_EXECUTION','Execution Lab','advanced-tool.html?tool=EXECUTION_LAB','trade','EXECUTION_LAB','signed_in',true,true,50,null),
('TRADE_VALIDATION','Strategy Validation','advanced-tool.html?tool=STRATEGY_VALIDATION','trade','STRATEGY_VALIDATION','signed_in',true,true,60,null),
('TRADE_ALL','All Trade Labs','tools.html#trade','trade',null,'any',true,true,90,null),
('RESEARCH_DISCOVERY','Market Discovery Lab','advanced-tool.html?tool=DISCOVERY_LAB','research','DISCOVERY_LAB','signed_in',true,true,10,null),
('RESEARCH_SCANNER','Scanner Builder','advanced-tool.html?tool=SCANNER_BUILDER','research','SCANNER_BUILDER','signed_in',true,true,20,null),
('RESEARCH_WATCHLIST','Watchlist Workbench','advanced-tool.html?tool=WATCHLIST_WORKBENCH','research','WATCHLIST_WORKBENCH','signed_in',true,true,30,null),
('RESEARCH_CATALYST','Catalyst & Filing Research','advanced-tool.html?tool=CATALYST_RESEARCH','research','CATALYST_RESEARCH','signed_in',true,true,40,null),
('RESEARCH_CONTEXT','Market Context Lab','advanced-tool.html?tool=MARKET_CONTEXT_LAB','research','MARKET_CONTEXT_LAB','signed_in',true,true,50,null),
('RESEARCH_DATA','Data Connections','data-connections.html','research',null,'signed_in',true,true,70,null),
('RESEARCH_ALL','All Research Tools','tools.html#research','research',null,'any',true,true,90,null),
('TOP_COMMONS','Market Commons','forum.html','top',null,'any',true,true,10,'community'),
('TOP_STORE','Store','store.html','top',null,'any',true,true,20,'store')
on conflict(item_code) do update set label=excluded.label,href=excluded.href,menu_group=excluded.menu_group,tool_code=excluded.tool_code,auth_mode=excluded.auth_mode,sort_order=excluded.sort_order,style_variant=excluded.style_variant,updated_at=now();

-- ============================================================
-- THE GROUND-UP MARKET COMMONS: OFFICIAL DISCUSSION POSTS
-- These coexist with the existing member discussion forum and are managed by Admin.
-- ============================================================
create table if not exists public.forum_official_posts (
  post_code text primary key,
  category text not null,
  title text not null,
  summary text,
  body text not null,
  status text not null default 'draft' check(status in ('draft','published','disabled','archived')),
  pinned boolean not null default false,
  public_visible boolean not null default true,
  sort_order integer not null default 100,
  author_label text not null default 'Site Administration',
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists forum_official_posts_public_idx on public.forum_official_posts(status,pinned,sort_order);
alter table public.forum_official_posts enable row level security;
drop policy if exists "public reads official forum posts" on public.forum_official_posts;
create policy "public reads official forum posts" on public.forum_official_posts for select to anon,authenticated using(status='published' and public_visible=true);
revoke all on public.forum_official_posts from anon,authenticated;
grant select on public.forum_official_posts to anon,authenticated;
grant all on public.forum_official_posts to service_role;

insert into public.forum_official_posts(post_code,category,title,summary,body,status,pinned,public_visible,sort_order,author_label,published_at) values
('WELCOME_COMMONS','Start Here','Welcome to The Ground-Up Market Commons','How to use the community as a place to improve decisions rather than chase calls.','Use this community to explain what you saw, what evidence mattered, what would invalidate the idea, and what you learned afterward. Posts should help another trader understand the decision process. Avoid pump-and-dump coordination, guaranteed-return claims, unsupported rumors, personal attacks, or requests for blind trade calls. A strong discussion gives context: ticker, session, timeframe, catalyst if relevant, structure, levels, volume/liquidity, entry trigger, invalidation, and what would make the idea a NO TRADE. The goal is not to prove that every trade should win. The goal is to make the reasoning inspectable and useful.', 'published',true,true,10,'J. S. Grant / Site Administration',now()),
('ENTRY_TRIGGER_INVALIDATION','Trade Planning','Reason for Entry, Trigger, and Invalidation Are Three Different Things','A practical framework for writing a trade plan before the market outcome is known.','Reason for entry explains why the setup deserves consideration. The entry trigger defines the event that actually authorizes execution. Invalidation defines what would make the original thesis no longer valid. Example: the reason may be a higher low above VWAP with expanding participation; the trigger may be a confirmed break and hold over a defined level; invalidation may be loss of the higher low and failure back below VWAP. Keeping these separate reduces vague entries such as “it looked strong” and makes Plan vs. Actual review possible.', 'published',true,true,20,'J. S. Grant / Site Administration',now()),
('NO_TRADE_DECISION','Trade Planning','NO TRADE Is a Valid Trading Decision','Why passing on a setup is part of execution quality, not inactivity.','A trader does not need to force every chart into an entry. A valid NO TRADE decision can come from an excessive spread, poor liquidity, missing confirmation, insufficient room to the next level, unclear catalyst, unacceptable risk, conflicting timeframes, late extension, or a thesis that cannot be invalidated cleanly. Record what prevented the trade. Over time, NO TRADE records can reveal whether patience is protecting the account or whether fear is causing valid setups to be skipped.', 'published',false,true,30,'J. S. Grant / Site Administration',now()),
('MFE_MAE_REVIEW','Risk & Review','MFE and MAE: Diagnose the Trade Without Rewriting History','Use excursion data to study entry and exit behavior without pretending the best price was knowable in real time.','Maximum Favorable Excursion (MFE) measures the greatest favorable movement while the position was open. Maximum Adverse Excursion (MAE) measures the greatest adverse movement while it was open. They can help compare entries, stops, targets, and exit behavior across many trades. They do not prove that a trader “should have” exited at the maximum favorable price, because that maximum is only known afterward. The useful question is whether repeated excursion patterns reveal a process issue.', 'published',false,true,40,'J. S. Grant / Site Administration',now()),
('HOD_LOD_CONTEXT','Market Structure','HOD and LOD Are Dynamic References, Not Automatic Signals','How to use High of Day and Low of Day as context without turning them into mechanical entries.','High of Day (HOD) and Low of Day (LOD) change as the session develops. They are reference levels that can matter because traders can react around them, but the level alone does not create a trade. Ask what price structure, volume, liquidity, catalyst, session timing, and nearby support/resistance are doing around the level. A break of HOD with no participation can mean something very different from a break supported by expanding volume and clean structure.', 'published',false,true,50,'J. S. Grant / Site Administration',now()),
('VWAP_CONTEXT','Market Structure','VWAP Is Context — Not a Buy or Sell Button','A structured way to discuss VWAP without treating one line as a complete strategy.','VWAP can help describe where price is trading relative to the session’s volume-weighted average, but it should be combined with other evidence. Discuss whether price is holding, reclaiming, rejecting, or repeatedly crossing VWAP; what the structure is doing; whether volume confirms the move; and where nearby levels sit. A VWAP interaction is evidence. It is not, by itself, a complete reason to enter.', 'published',false,true,60,'J. S. Grant / Site Administration',now()),
('TAPE_OBSERVATION','Order Flow','Level II and Time & Sales: Observe First, Infer Carefully','A discussion standard for tape reading that separates displayed evidence from assumptions about hidden intent.','Level II and Time & Sales can reveal displayed liquidity, executed prints, pace, size, and changing bid/ask interaction. They do not reveal every hidden order or a trader’s intent. When discussing the tape, describe what was actually observable: size appeared, size disappeared, prints accelerated, the spread changed, or repeated executions occurred at a level. Then state the inference separately. This keeps the discussion evidence-based and reduces stories built from information the display cannot prove.', 'published',false,true,70,'J. S. Grant / Site Administration',now()),
('PROCESS_OUTCOME_MATRIX','Journal & Analytics','Good Process Can Lose — Bad Process Can Win','Use the process/outcome matrix to prevent profitable mistakes from becoming bad habits.','A trade can have good process and a losing outcome. It can also have bad process and a profitable outcome. The second case is dangerous because profit can reward a rule violation. Review both dimensions separately: Was the thesis reasonable with the information available? Was risk defined? Was the trigger followed? Was invalidation respected? Then review the financial outcome. The purpose is to reinforce repeatable behavior rather than treating profit as proof that the decision was correct.', 'published',false,true,80,'J. S. Grant / Site Administration',now()),
('CATALYST_VERIFICATION','Research','Catalyst Verification Before the Trade','A source-first checklist for separating an actual catalyst from a headline, rumor, or recycled story.','Before treating news as a catalyst, identify the original source, timestamp, company/ticker match, material event, and whether the information is new. For filings, verify the form and the actual terms rather than relying on a headline. Check financing, offerings, warrants, convertibles, splits, reverse splits, dilution, contracts, earnings, regulatory events, and other company-specific developments in context. If the source cannot be verified, label the claim as unverified instead of upgrading it to fact.', 'published',false,true,90,'J. S. Grant / Site Administration',now()),
('REPLAY_WITHOUT_HINDSIGHT','Practice','How to Practice Historical Replay Without Hindsight','A repeatable workflow for making the decision before revealing the outcome.','Start with only the information that would have been available at the decision point. Review prior-day context, the current session, structure, volume, liquidity, catalyst, and relevant levels. Write ENTER, WATCH, or NO TRADE; define the trigger and invalidation; then lock the decision. Advance the replay only after the reasoning is recorded. When the outcome is revealed, review what changed rather than judging the original decision solely by whether price later moved up or down.', 'published',false,true,100,'J. S. Grant / Site Administration',now())
on conflict(post_code) do update set category=excluded.category,title=excluded.title,summary=excluded.summary,body=excluded.body,status=excluded.status,pinned=excluded.pinned,public_visible=excluded.public_visible,sort_order=excluded.sort_order,author_label=excluded.author_label,updated_at=now();

insert into public.site_settings(setting_key,category,value,public_read,description) values
('community.name','community','"The Ground-Up Market Commons"'::jsonb,true,'Public community/forum name.'),
('community.tagline','community','"A working community for market reasoning, trade review, research, and evidence-based discussion."'::jsonb,true,'Community tagline.'),
('feature.official_forum_posts','features','true'::jsonb,true,'Show official discussion guides above the member forum.'),
('site.version','site','"0.12"'::jsonb,true,'Current public website version.')
on conflict(setting_key) do update set value=excluded.value,public_read=excluded.public_read,description=excluded.description,updated_at=now();

-- Service-role grants for admin/server operations.
grant all on public.forum_official_posts,public.platform_labs,public.site_navigation_items,public.plan_ad_policies to service_role;

-- Ask PostgREST to refresh schema metadata.
notify pgrst, 'reload schema';

-- Add structured prompts so the seeded guides function as real discussion starters.
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: What standards should every post in this community meet before it is published? What information would make another trader able to evaluate the reasoning rather than merely copy a call?' where post_code='WELCOME_COMMONS' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: Choose one historical or simulated setup and write three separate lines: Reason for Entry, Entry Trigger, and Invalidation. Which of the three is usually hardest to define before the trade?' where post_code='ENTRY_TRIGGER_INVALIDATION' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: Describe a recent chart you correctly passed on. What made it a NO TRADE, and what would have needed to change before it became actionable?' where post_code='NO_TRADE_DECISION' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: When reviewing a trade, what did MFE and MAE reveal that final P&L did not? Avoid hindsight claims about the exact best exit.' where post_code='MFE_MAE_REVIEW' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: Post an example where HOD or LOD mattered as a reference but was not enough by itself to justify an entry. What other evidence changed the decision?' where post_code='HOD_LOD_CONTEXT' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: Compare a clean VWAP hold/reclaim with a weak one. What structure, volume, liquidity, or location evidence made the difference?' where post_code='VWAP_CONTEXT' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: Describe only what the tape actually displayed first. Then write your inference separately. Which parts are observations and which parts are interpretation?' where post_code='TAPE_OBSERVATION' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: Share a simulated or historical trade that was profitable despite poor process, or lost despite good process. What behavior should be reinforced?' where post_code='PROCESS_OUTCOME_MATRIX' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: Pick a catalyst and identify the primary source, timestamp, exact event, and any financing/dilution/corporate-action detail that could materially change the interpretation.' where post_code='CATALYST_VERIFICATION' and body not like '%Discussion prompt:%';
update public.forum_official_posts set body=body || E'\n\nDiscussion prompt: During replay, what information did you lock before advancing the next candle? What changed after the decision point, and did that new information justify changing the plan?' where post_code='REPLAY_WITHOUT_HINDSIGHT' and body not like '%Discussion prompt:%';


-- ============================================================
-- v0.12.1 PROFILE / MEMBERSHIP IDENTITY / AUTH AD PLACEMENTS
-- ============================================================
update public.platform_plans set name='Free Membership',description='Free account with public samples, limited learning tools, limited Tutor access, basic progress, and selected trial experiences.',updated_at=now() where plan_code='FREE';
update public.platform_plans set name='Monthly Membership',updated_at=now() where plan_code='FULL_MONTHLY';
update public.platform_plans set name='Annual Membership',updated_at=now() where plan_code='FULL_ANNUAL';
update public.platform_plans set name='Lifetime Membership',updated_at=now() where plan_code='LIFETIME';
insert into public.platform_plans(plan_code,name,description,price_cents,billing_interval,active,public_visible,ad_free,includes_all_tools,includes_all_books,sort_order,metadata)
values('PICK_WHAT_YOU_WANT','Pick What You Want Membership','Build your own access by selecting individual premium tools. Tool charges and entitlements are managed separately.',0,'none',true,false,false,false,false,15,'{"access_model":"individual_tool_passes"}'::jsonb)
on conflict(plan_code) do update set name=excluded.name,description=excluded.description,active=true,ad_free=false,includes_all_tools=false,includes_all_books=false,metadata=excluded.metadata,updated_at=now();

insert into public.plan_ad_policies(access_code,label,ads_enabled,max_impressions_per_session,max_impressions_per_24h,minimum_minutes_between_ads,allowed_slots,notes)
values('PICK_WHAT_YOU_WANT','Pick What You Want Membership',true,2,4,10,array['HOME_INLINE','STORE_INLINE','COMMUNITY_INLINE','FREE_DASHBOARD','SAMPLE_LABS']::text[],'Individual tool members may receive reduced sponsor inventory.')
on conflict(access_code) do update set label=excluded.label,ads_enabled=excluded.ads_enabled,max_impressions_per_session=excluded.max_impressions_per_session,max_impressions_per_24h=excluded.max_impressions_per_24h,minimum_minutes_between_ads=excluded.minimum_minutes_between_ads,notes=excluded.notes,updated_at=now();

insert into public.ad_placements(placement_code,name,description,page_pattern,slot_position,active,free_only,dimensions,sort_order,metadata) values
('SIGNIN_LEFT','Sign In — Left Sponsor','Left-side sponsor placement on the Sign In page.','/signin*','left',true,true,'responsive rail',210,'{"auth_page":true}'::jsonb),
('SIGNIN_RIGHT','Sign In — Right Sponsor','Right-side sponsor placement on the Sign In page.','/signin*','right',true,true,'responsive rail',220,'{"auth_page":true}'::jsonb),
('SIGNIN_BOTTOM','Sign In — Bottom Sponsor','Bottom sponsor placement beneath the Sign In form.','/signin*','bottom',true,true,'responsive banner',230,'{"auth_page":true}'::jsonb),
('SIGNUP_LEFT','Create Account — Left Sponsor','Left-side sponsor placement on the Create Account page.','/create-account*','left',true,true,'responsive rail',240,'{"auth_page":true}'::jsonb),
('SIGNUP_RIGHT','Create Account — Right Sponsor','Right-side sponsor placement on the Create Account page.','/create-account*','right',true,true,'responsive rail',250,'{"auth_page":true}'::jsonb),
('SIGNUP_BOTTOM','Create Account — Bottom Sponsor','Bottom sponsor placement beneath the Create Account form.','/create-account*','bottom',true,true,'responsive banner',260,'{"auth_page":true}'::jsonb)
on conflict(placement_code) do update set name=excluded.name,description=excluded.description,page_pattern=excluded.page_pattern,slot_position=excluded.slot_position,dimensions=excluded.dimensions,metadata=excluded.metadata;

-- Signed-out visitors are the normal audience for authentication pages.
update public.plan_ad_policies set allowed_slots=(select array_agg(distinct x) from unnest(allowed_slots || array['SIGNIN_LEFT','SIGNIN_RIGHT','SIGNIN_BOTTOM','SIGNUP_LEFT','SIGNUP_RIGHT','SIGNUP_BOTTOM']) x),updated_at=now() where access_code='SIGNED_OUT';

insert into public.site_settings(setting_key,category,value,public_read,description) values
('profile.feature_list_default','profile','5'::jsonb,true,'Default number of membership features shown in Profile before Show All.'),
('profile.tabs_enabled','profile','true'::jsonb,true,'Use Profile / Membership & Access / Settings tabs on the member profile.'),
('site.version','site','"0.12.1"'::jsonb,true,'Current public website version.')
on conflict(setting_key) do update set value=excluded.value,public_read=excluded.public_read,description=excluded.description,updated_at=now();

notify pgrst, 'reload schema';


-- Canonical membership identity returned everywhere.
-- The effective tier is selected across both administrative grants and paid subscriptions,
-- so a lower tier never masks a higher active tier.
create or replace function public.my_platform_access()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid := auth.uid();
  staff_roles text[] := array[]::text[];
  selected_plan text := 'FREE';
  selected_plan_name text := 'Free Membership';
  renewal_at timestamptz := null;
  starts_at timestamptz := null;
  expires_at timestamptz := null;
  ad_free boolean := false;
  has_all_tools boolean := false;
  has_all_books boolean := false;
  legacy_full boolean := false;
  is_owner boolean := false;
  control_panel boolean := false;
  tools jsonb := '[]'::jsonb;
  books jsonb := '[]'::jsonb;
  passes jsonb := '[]'::jsonb;
  accessrow record;
begin
  if uid is null then
    return jsonb_build_object(
      'authenticated',false,'planCode','FREE','planName','Free Membership',
      'staffRoles',staff_roles,'controlPanel',false,'adFree',false,
      'tools','[]'::jsonb,'books','[]'::jsonb,'toolPasses','[]'::jsonb
    );
  end if;

  select coalesce(array_agg(distinct role_code) filter(where role_code is not null),array[]::text[])
    into staff_roles
    from public.admin_user_roles
    where user_id=uid and (expires_at is null or expires_at>now());

  is_owner := 'OWNER'=any(staff_roles);

  select exists(
    select 1
    from public.admin_user_roles ur
    join public.admin_role_permissions rp on rp.role_code=ur.role_code
    where ur.user_id=uid
      and (ur.expires_at is null or ur.expires_at>now())
      and rp.permission_code='control_panel.access'
  ) into control_panel;

  if is_owner then
    selected_plan:='LIFETIME';
    selected_plan_name:='Lifetime Membership';
    ad_free:=true;
    has_all_tools:=true;
    has_all_books:=true;
  else
    select z.* into accessrow
    from (
      select
        g.plan_code,
        p.name,
        p.ad_free,
        p.includes_all_tools,
        p.includes_all_books,
        g.starts_at,
        null::timestamptz as renews_at,
        g.ends_at as expires_at,
        'admin_grant'::text as source_kind,
        case when g.ends_at is null then 0 else 1 end as source_rank
      from public.user_plan_grants g
      join public.platform_plans p on p.plan_code=g.plan_code
      where g.user_id=uid
        and g.status in ('trialing','active')
        and g.starts_at<=now()
        and (g.ends_at is null or g.ends_at>now())

      union all

      select
        s.plan_code,
        p.name,
        p.ad_free,
        p.includes_all_tools,
        p.includes_all_books,
        s.created_at as starts_at,
        s.current_period_end as renews_at,
        null::timestamptz as expires_at,
        'subscription'::text as source_kind,
        1 as source_rank
      from public.site_subscriptions s
      join public.platform_plans p on p.plan_code=s.plan_code
      where s.user_id=uid
        and s.status in ('trialing','active')
        and (s.current_period_end is null or s.current_period_end>now())
    ) z
    order by
      case z.plan_code
        when 'LIFETIME' then 1
        when 'FULL_ANNUAL' then 2
        when 'FULL_MONTHLY' then 3
        when 'PICK_WHAT_YOU_WANT' then 4
        when 'FREE' then 10
        else 8
      end,
      z.source_rank,
      coalesce(z.expires_at,z.renews_at,'infinity'::timestamptz) desc,
      z.starts_at desc
    limit 1;

    if accessrow.plan_code is not null then
      selected_plan:=accessrow.plan_code;
      selected_plan_name:=accessrow.name;
      starts_at:=accessrow.starts_at;
      renewal_at:=accessrow.renews_at;
      expires_at:=accessrow.expires_at;
      ad_free:=accessrow.ad_free;
      has_all_tools:=accessrow.includes_all_tools;
      has_all_books:=accessrow.includes_all_books;
    else
      select exists(
        select 1 from public.entitlements e
        where e.user_id=uid
          and e.product_key='full_learning_access'
          and e.status in ('active','trialing')
          and (e.starts_at is null or e.starts_at<=now())
          and (e.ends_at is null or e.ends_at>now())
      ) into legacy_full;

      if legacy_full then
        selected_plan:='BOOK_TRIAL';
        selected_plan_name:='Trial Membership';
        has_all_tools:=true;
        select min(e.starts_at),max(e.ends_at)
          into starts_at,expires_at
          from public.entitlements e
          where e.user_id=uid
            and e.product_key='full_learning_access'
            and e.status in ('active','trialing')
            and (e.ends_at is null or e.ends_at>now());
      end if;
    end if;
  end if;

  select coalesce(jsonb_agg(x order by x->>'name'),'[]'::jsonb) into passes
  from (
    select jsonb_build_object(
      'toolCode',t.tool_code,
      'name',t.name,
      'href',t.href,
      'status',up.status,
      'startsAt',up.starts_at,
      'renewsAt',up.current_period_end,
      'expiresAt',up.ends_at,
      'cancelAtPeriodEnd',up.cancel_at_period_end
    ) x
    from public.user_tool_passes up
    join public.platform_tools t on t.tool_code=up.tool_code
    where up.user_id=uid
      and up.status in ('trialing','active')
      and up.starts_at<=now()
      and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())
  ) q;

  if selected_plan='FREE' and jsonb_array_length(passes)>0 then
    selected_plan:='PICK_WHAT_YOU_WANT';
    selected_plan_name:='Pick What You Want Membership';
    ad_free:=false;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'toolCode',t.tool_code,
    'name',t.name,
    'category',t.category,
    'href',t.href,
    'status',t.status,
    'description',t.description,
    'included',
      (has_all_tools and t.status<>'retired')
      or exists(
        select 1 from public.user_tool_passes up
        where up.user_id=uid
          and up.tool_code=t.tool_code
          and up.status in ('trialing','active')
          and up.starts_at<=now()
          and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())
      ),
    'freePreview',t.free_preview,
    'individualPriceCents',t.individual_price_cents
  ) order by t.sort_order),'[]'::jsonb) into tools
  from public.platform_tools t
  where t.active=true and t.public_visible=true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'productCode',c.product_code,
    'title',c.title,
    'shortTitle',c.short_title,
    'family',c.family,
    'publicationStatus',c.publication_status,
    'included',
      has_all_books
      or exists(
        select 1 from public.user_library ul
        where ul.user_id=uid
          and ul.product_code=c.product_code
          and (ul.expires_at is null or ul.expires_at>now())
      ),
    'source',
      case
        when has_all_books then 'membership'
        else (
          select ul.source_channel
          from public.user_library ul
          where ul.user_id=uid
            and ul.product_code=c.product_code
            and (ul.expires_at is null or ul.expires_at>now())
          order by ul.granted_at desc
          limit 1
        )
      end
  ) order by c.sort_order),'[]'::jsonb) into books
  from public.catalog_products c
  where c.active=true and c.product_type='book';

  return jsonb_build_object(
    'authenticated',true,
    'planCode',selected_plan,
    'planName',selected_plan_name,
    'startsAt',starts_at,
    'renewsAt',renewal_at,
    'expiresAt',expires_at,
    'adFree',ad_free,
    'controlPanel',control_panel,
    'allTools',has_all_tools,
    'allBooks',has_all_books,
    'staffRoles',staff_roles,
    'toolPasses',passes,
    'tools',tools,
    'books',books
  );
end;$$;
grant execute on function public.my_platform_access() to authenticated,anon;

create or replace function public.my_platform_access_for_user(target_user uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  roles text[]:=array[]::text[];
  r record;
begin
  select coalesce(array_agg(role_code),array[]::text[])
    into roles
    from public.admin_user_roles
    where user_id=target_user and (expires_at is null or expires_at>now());

  if 'OWNER'=any(roles) then
    return jsonb_build_object(
      'planCode','LIFETIME','planName','Lifetime Membership','adFree',true,
      'startsAt',null,'renewsAt',null,'expiresAt',null
    );
  end if;

  select z.* into r
  from (
    select
      g.plan_code,p.name,p.ad_free,g.starts_at,
      null::timestamptz as renews_at,g.ends_at as expires_at,
      case when g.ends_at is null then 0 else 1 end as source_rank
    from public.user_plan_grants g
    join public.platform_plans p on p.plan_code=g.plan_code
    where g.user_id=target_user
      and g.status in ('trialing','active')
      and g.starts_at<=now()
      and (g.ends_at is null or g.ends_at>now())

    union all

    select
      s.plan_code,p.name,p.ad_free,s.created_at as starts_at,
      s.current_period_end as renews_at,null::timestamptz as expires_at,
      1 as source_rank
    from public.site_subscriptions s
    join public.platform_plans p on p.plan_code=s.plan_code
    where s.user_id=target_user
      and s.status in ('trialing','active')
      and (s.current_period_end is null or s.current_period_end>now())
  ) z
  order by
    case z.plan_code
      when 'LIFETIME' then 1
      when 'FULL_ANNUAL' then 2
      when 'FULL_MONTHLY' then 3
      when 'PICK_WHAT_YOU_WANT' then 4
      when 'FREE' then 10
      else 8
    end,
    z.source_rank,
    coalesce(z.expires_at,z.renews_at,'infinity'::timestamptz) desc,
    z.starts_at desc
  limit 1;

  if r.plan_code is not null then
    return jsonb_build_object(
      'planCode',r.plan_code,'planName',r.name,'adFree',r.ad_free,
      'startsAt',r.starts_at,'renewsAt',r.renews_at,'expiresAt',r.expires_at
    );
  end if;

  if exists(
    select 1 from public.entitlements e
    where e.user_id=target_user
      and e.product_key='full_learning_access'
      and e.status in ('active','trialing')
      and (e.starts_at is null or e.starts_at<=now())
      and (e.ends_at is null or e.ends_at>now())
  ) then
    return jsonb_build_object('planCode','BOOK_TRIAL','planName','Trial Membership','adFree',false);
  end if;

  if exists(
    select 1 from public.user_tool_passes up
    where up.user_id=target_user
      and up.status in ('active','trialing')
      and up.starts_at<=now()
      and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())
  ) then
    return jsonb_build_object('planCode','PICK_WHAT_YOU_WANT','planName','Pick What You Want Membership','adFree',false);
  end if;

  return jsonb_build_object('planCode','FREE','planName','Free Membership','adFree',false);
end;$$;
revoke all on function public.my_platform_access_for_user(uuid) from anon,authenticated;
grant execute on function public.my_platform_access_for_user(uuid) to service_role;

notify pgrst, 'reload schema';
