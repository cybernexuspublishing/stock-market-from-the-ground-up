-- v0.13.1 CUMULATIVE migration from deployed v0.11.3
-- Run this ONE file. Do not run v0.12.x or v0.13 separately.

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


-- v0.13 Production Commerce + Member Hub + Market Commons + Admin Academy
-- Run AFTER v0.12.1_profile_membership_admin_ui.sql.
-- This migration is additive and preserves existing accounts, books, orders, journal data, labs, and prior forum data.

-- ============================================================
-- 1) FIX MEMBERSHIP ACCESS RESOLVER (ambiguous expires_at)
-- ============================================================
create or replace function public.my_platform_access()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid := auth.uid();
  v_staff_roles text[] := array[]::text[];
  v_selected_plan text := 'FREE';
  v_selected_plan_name text := 'Free Membership';
  v_renewal_at timestamptz := null;
  v_starts_at timestamptz := null;
  v_expires_at timestamptz := null;
  v_ad_free boolean := false;
  v_has_all_tools boolean := false;
  v_has_all_books boolean := false;
  v_legacy_full boolean := false;
  v_is_owner boolean := false;
  v_control_panel boolean := false;
  v_tools jsonb := '[]'::jsonb;
  v_books jsonb := '[]'::jsonb;
  v_passes jsonb := '[]'::jsonb;
  v_accessrow record;
begin
  if v_uid is null then
    return jsonb_build_object(
      'authenticated',false,'planCode','FREE','planName','Free Membership',
      'staffRoles',v_staff_roles,'controlPanel',false,'adFree',false,
      'tools','[]'::jsonb,'books','[]'::jsonb,'toolPasses','[]'::jsonb
    );
  end if;

  select coalesce(array_agg(distinct aur.role_code) filter(where aur.role_code is not null),array[]::text[])
    into v_staff_roles
    from public.admin_user_roles aur
    where aur.user_id=v_uid and (aur.expires_at is null or aur.expires_at>now());

  v_is_owner := 'OWNER'=any(v_staff_roles);

  select exists(
    select 1
    from public.admin_user_roles aur
    join public.admin_role_permissions arp on arp.role_code=aur.role_code
    where aur.user_id=v_uid
      and (aur.expires_at is null or aur.expires_at>now())
      and arp.permission_code='control_panel.access'
  ) into v_control_panel;

  if v_is_owner then
    v_selected_plan:='LIFETIME';
    v_selected_plan_name:='Lifetime Membership';
    v_ad_free:=true;
    v_has_all_tools:=true;
    v_has_all_books:=true;
  else
    select z.* into v_accessrow
    from (
      select
        g.plan_code,
        p.name,
        p.ad_free,
        p.includes_all_tools,
        p.includes_all_books,
        g.starts_at,
        null::timestamptz as renews_at,
        g.ends_at as plan_expires_at,
        'admin_grant'::text as source_kind,
        case when g.ends_at is null then 0 else 1 end as source_rank
      from public.user_plan_grants g
      join public.platform_plans p on p.plan_code=g.plan_code
      where g.user_id=v_uid
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
        null::timestamptz as plan_expires_at,
        'subscription'::text as source_kind,
        1 as source_rank
      from public.site_subscriptions s
      join public.platform_plans p on p.plan_code=s.plan_code
      where s.user_id=v_uid
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
      coalesce(z.plan_expires_at,z.renews_at,'infinity'::timestamptz) desc,
      z.starts_at desc
    limit 1;

    if v_accessrow.plan_code is not null then
      v_selected_plan:=v_accessrow.plan_code;
      v_selected_plan_name:=v_accessrow.name;
      v_starts_at:=v_accessrow.starts_at;
      v_renewal_at:=v_accessrow.renews_at;
      v_expires_at:=v_accessrow.plan_expires_at;
      v_ad_free:=v_accessrow.ad_free;
      v_has_all_tools:=v_accessrow.includes_all_tools;
      v_has_all_books:=v_accessrow.includes_all_books;
    else
      select exists(
        select 1 from public.entitlements e
        where e.user_id=v_uid
          and e.product_key='full_learning_access'
          and e.status in ('active','trialing')
          and (e.starts_at is null or e.starts_at<=now())
          and (e.ends_at is null or e.ends_at>now())
      ) into v_legacy_full;

      if v_legacy_full then
        v_selected_plan:='BOOK_TRIAL';
        v_selected_plan_name:='Trial Membership';
        v_has_all_tools:=true;
        select min(e.starts_at),max(e.ends_at)
          into v_starts_at,v_expires_at
          from public.entitlements e
          where e.user_id=v_uid
            and e.product_key='full_learning_access'
            and e.status in ('active','trialing')
            and (e.ends_at is null or e.ends_at>now());
      end if;
    end if;
  end if;

  select coalesce(jsonb_agg(q.x order by q.x->>'name'),'[]'::jsonb) into v_passes
  from (
    select jsonb_build_object(
      'toolCode',t.tool_code,'name',t.name,'href',t.href,'status',up.status,
      'startsAt',up.starts_at,'renewsAt',up.current_period_end,'expiresAt',up.ends_at,
      'cancelAtPeriodEnd',up.cancel_at_period_end
    ) as x
    from public.user_tool_passes up
    join public.platform_tools t on t.tool_code=up.tool_code
    where up.user_id=v_uid
      and up.status in ('trialing','active')
      and up.starts_at<=now()
      and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())
  ) q;

  if v_selected_plan='FREE' and jsonb_array_length(v_passes)>0 then
    v_selected_plan:='PICK_WHAT_YOU_WANT';
    v_selected_plan_name:='Pick What You Want Membership';
    v_ad_free:=false;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'toolCode',t.tool_code,'name',t.name,'category',t.category,'href',t.href,'status',t.status,
    'description',t.description,
    'included',
      (v_has_all_tools and t.status<>'retired')
      or exists(
        select 1 from public.user_tool_passes up
        where up.user_id=v_uid and up.tool_code=t.tool_code and up.status in ('trialing','active')
          and up.starts_at<=now()
          and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())
      ),
    'freePreview',t.free_preview,'individualPriceCents',t.individual_price_cents
  ) order by t.sort_order),'[]'::jsonb) into v_tools
  from public.platform_tools t
  where t.active=true and t.public_visible=true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'productCode',c.product_code,'title',c.title,'shortTitle',c.short_title,'family',c.family,
    'publicationStatus',c.publication_status,
    'included',v_has_all_books or exists(
      select 1 from public.user_library ul
      where ul.user_id=v_uid and ul.product_code=c.product_code
        and (ul.expires_at is null or ul.expires_at>now())
    ),
    'source',case when v_has_all_books then 'membership' else (
      select ul.source_channel from public.user_library ul
      where ul.user_id=v_uid and ul.product_code=c.product_code
        and (ul.expires_at is null or ul.expires_at>now())
      order by ul.granted_at desc limit 1
    ) end
  ) order by c.sort_order),'[]'::jsonb) into v_books
  from public.catalog_products c
  where c.active=true and c.product_type='book';

  return jsonb_build_object(
    'authenticated',true,'planCode',v_selected_plan,'planName',v_selected_plan_name,
    'startsAt',v_starts_at,'renewsAt',v_renewal_at,'expiresAt',v_expires_at,'adFree',v_ad_free,
    'controlPanel',v_control_panel,'allTools',v_has_all_tools,'allBooks',v_has_all_books,
    'staffRoles',v_staff_roles,'toolPasses',v_passes,'tools',v_tools,'books',v_books
  );
end;$$;
grant execute on function public.my_platform_access() to authenticated,anon;

-- ============================================================
-- 2) PRODUCTION STORE / CHECKOUT READINESS
-- ============================================================
alter table public.catalog_products add column if not exists store_visible boolean not null default true;
alter table public.catalog_products add column if not exists sales_status text not null default 'coming_soon';
alter table public.catalog_products add column if not exists amazon_kindle_enabled boolean not null default true;
alter table public.catalog_products add column if not exists amazon_paperback_enabled boolean not null default true;
alter table public.catalog_products add column if not exists amazon_hardcover_enabled boolean not null default true;
alter table public.catalog_products add column if not exists website_checkout_enabled boolean not null default false;
alter table public.catalog_products add column if not exists lemon_variant_id text;

alter table public.platform_plans add column if not exists checkout_enabled boolean not null default false;
alter table public.platform_plans add column if not exists lemon_variant_id text;
alter table public.platform_tools add column if not exists checkout_enabled boolean not null default false;
alter table public.platform_tools add column if not exists lemon_variant_id text;

create table if not exists public.checkout_intents (
  intent_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  item_code text not null,
  amount_cents integer not null check(amount_cents>=0),
  currency text not null default 'USD',
  provider text not null default 'LEMON_SQUEEZY',
  provider_checkout_id text,
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checkout_intents_user_idx on public.checkout_intents(user_id,created_at desc);
alter table public.checkout_intents enable row level security;
drop policy if exists "users read own checkout intents" on public.checkout_intents;
create policy "users read own checkout intents" on public.checkout_intents for select to authenticated using(auth.uid()=user_id);
revoke all on public.checkout_intents from anon,authenticated;
grant select on public.checkout_intents to authenticated;
grant all on public.checkout_intents to service_role;

create table if not exists public.payment_webhook_events (
  event_id text primary key,
  provider text not null,
  event_name text not null,
  user_id uuid,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  error_message text
);
alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from anon,authenticated;
grant all on public.payment_webhook_events to service_role;

insert into public.site_settings(setting_key,category,value,public_read,description) values
('commerce.checkout_enabled','commerce','false'::jsonb,true,'Master switch for public paid checkout. Enable only after payment-provider test checkout and webhook verification pass.'),
('commerce.provider','commerce','"LEMON_SQUEEZY"'::jsonb,true,'Payment rail used behind the first-party checkout experience.'),
('commerce.checkout_test_mode','commerce','true'::jsonb,false,'Owner/QA test mode until production credentials and variants are verified.'),
('site.version','site','"0.13"'::jsonb,true,'Current public website version.')
on conflict(setting_key) do update set value=excluded.value,description=excluded.description,public_read=excluded.public_read,updated_at=now();

-- Give current memberships first-party checkout destinations while preserving activation control.
update public.platform_plans set checkout_url='checkout.html?type=plan&code='||plan_code where plan_code in ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME');
update public.platform_tools set individual_checkout_url='checkout.html?type=tool&code='||tool_code where active=true and status<>'retired';

-- ============================================================
-- 3) SECURE MEMBER CONNECTION / TOKEN VAULT METADATA
-- Ciphertext is written only through Cloudflare Pages Functions.
-- ============================================================
create table if not exists public.user_secure_credentials (
  user_id uuid not null references auth.users(id) on delete cascade,
  service_code text not null,
  display_label text not null,
  credential_ciphertext text not null,
  credential_iv text not null,
  masked_hint text,
  status text not null default 'saved',
  last_tested_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,service_code)
);
alter table public.user_secure_credentials enable row level security;
revoke all on public.user_secure_credentials from anon,authenticated;
grant all on public.user_secure_credentials to service_role;

-- ============================================================
-- 4) HELP CENTER / MEMBER DOCUMENTATION
-- ============================================================
create table if not exists public.help_articles (
  article_code text primary key,
  category text not null,
  title text not null,
  summary text,
  body_markdown text not null,
  audience text not null default 'member',
  status text not null default 'published',
  sort_order integer not null default 100,
  updated_at timestamptz not null default now()
);
alter table public.help_articles enable row level security;
drop policy if exists "public reads published help" on public.help_articles;
create policy "public reads published help" on public.help_articles for select to anon,authenticated using(status='published' and audience in ('public','member'));
revoke all on public.help_articles from anon,authenticated;
grant select on public.help_articles to anon,authenticated;
grant all on public.help_articles to service_role;

insert into public.help_articles(article_code,category,title,summary,body_markdown,audience,status,sort_order) values
('GETTING_STARTED','Getting Started','Start Here: Your Member Dashboard','Where membership, books, settings, tools, connections, and help live.','Use the Member Dashboard as your account home. Overview shows learning activity. Membership & Access shows your active tier, renewal/expiration, and every included or unavailable platform feature. My Books shows book companion access. Settings contains account preferences and Book Key controls. Connections & API Keys is where you securely add any personal market-data credentials required by optional data adapters.','public','published',10),
('MEMBERSHIP_ACCESS','Memberships','Understanding Membership & Access','How Free, Pick What You Want, Monthly, Annual, Lifetime, trials, and book access differ.','Membership controls platform-tool access. Book Companion Access controls book-linked resources. Staff roles such as OWNER, ADMIN, or MODERATOR are separate from membership. Monthly and Annual memberships can renew; trials can expire; Lifetime Membership does not expire. Your dashboard always shows the effective membership and the exact tools included.','public','published',20),
('TOKENS_TIINGO','Connections & API Keys','Add a Tiingo API Token','Step-by-step instructions for connecting a personal Tiingo token.','Open Member Dashboard → Settings → Connections & API Keys. Choose Tiingo, paste your token, and select Save & Test. The browser sends the token only to the secure Cloudflare function. The server verifies the connection, encrypts the credential using AES-GCM, and stores only encrypted ciphertext. The raw token is never returned to the browser after saving. You can disconnect it at any time.','member','published',30),
('TOKENS_ALPACA','Connections & API Keys','Prepare an Alpaca Connection','Where Alpaca credentials will be managed when the adapter is activated.','Open Member Dashboard → Settings → Connections & API Keys. The Alpaca card is the account location for your personal API key and secret when that adapter is activated. Credentials are never stored in profile fields or browser local storage. Do not post API keys in Market Commons, screenshots, support messages, or journal notes.','member','published',40),
('BOOK_KEYS','Books','Redeem a Book Key','Where Book Keys belong and what they unlock.','Open Member Dashboard → Settings. Use the Book Key section to redeem a qualifying key. Book access is separate from membership. A qualifying Book Key can unlock that book’s companion branch and may activate the configured trial benefit.','member','published',50),
('LABS','Learning','Historical Labs and no-look-ahead practice','How to use Guided, Practice, Blind Decision, and Assessment modes.','Use the Lab Registry from the Learn menu. Read the historical context, record your decision before outcome information is revealed, and save the attempt. The purpose is to train process rather than hindsight. Your attempts, mistake tags, and competency evidence feed the learning record.','member','published',60),
('SIMULATOR','Trading Tools','Market Simulator & Replay','How the simulator connects planning, execution, replay, and review.','Use the simulator for historical no-look-ahead practice. Define the plan first, lock the plan, then execute and advance data. Completed simulated trades can be saved to the journal with P&L, R, MFE, MAE, reason for entry, reason for exit, and process review.','member','published',70),
('JOURNAL','Trading Tools','Trading Journal & Analytics','Using the same journal for live, paper, and simulated trading.','Record the environment, setup, entry reason, trigger, invalidation, risk, exit reason, and whether the plan was followed. Drafts can be incomplete; locked plans and completed trades enforce required fields. Use delayed review to separate outcome from process quality.','member','published',80),
('COMMONS','Market Commons','Using The Ground-Up Market Commons','How sub-forums, official guides, bookmarks, and replies work.','Choose the most specific sub-forum for your topic. Give enough context for another member to inspect your reasoning. Avoid blind calls, guaranteed returns, pump coordination, unsupported rumors, private data, and API keys. Official discussion guides are pinned where relevant.','public','published',90),
('BILLING','Billing','Billing, renewals, cancellations, and receipts','Where payment and renewal information appears.','Membership & Access shows the active tier and renewal or expiration countdown. My Purchases stores direct-site order history. When checkout is activated, payment processing occurs through the configured payment provider while the platform keeps its own entitlement and order records synchronized through signed webhooks.','member','published',100)
on conflict(article_code) do update set category=excluded.category,title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,audience=excluded.audience,status=excluded.status,sort_order=excluded.sort_order,updated_at=now();

-- ============================================================
-- 5) HIDDEN ADMIN SITE ACADEMY
-- ============================================================
create table if not exists public.admin_academy_lessons (
  lesson_code text primary key,
  section text not null,
  title text not null,
  objective text,
  body_markdown text not null,
  required_permission text,
  sort_order integer not null default 100,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.admin_academy_lessons enable row level security;
revoke all on public.admin_academy_lessons from anon,authenticated;
grant all on public.admin_academy_lessons to service_role;

insert into public.admin_academy_lessons(lesson_code,section,title,objective,body_markdown,required_permission,sort_order) values
('ACADEMY_OVERVIEW','Start Here','How the Control Center Is Organized','Understand the production areas before making changes.','The Control Center is organized by operational responsibility: Overview; Accounts & Access; Books & Learning; Commerce & Revenue; Community; and Site & Governance. Use the narrowest permission needed. Routine changes should use Enable/Disable or Archive instead of destructive deletion so historical purchases, analytics, and audit records remain intact.','dashboard.view',10),
('ACADEMY_ACCOUNTS','Accounts & Access','Manage Member Accounts Safely','Grant or revoke access without weakening identity/security controls.','Open Accounts, search the member, then open the account detail. Membership grants support begin and ending dates. Tool Passes support their own dates. Book sliders control explicit library access. Staff roles are separate from membership. OWNER-level operations are protected. Never ask a member to send a password or API token.','users.view',20),
('ACADEMY_BOOKS','Books & Learning','Add, Publish, Pause, or Hide a Book','Operate the catalog and Store without editing GitHub.','Create the book in Books & Catalog. Fill title, author, publisher, family, publication status, Amazon links, companion access, KDP Select status, and sales controls. Store Visible controls whether the title appears publicly. Purchase-channel toggles control which buttons can be offered. Prefer disabling a channel over deleting a title. KDP Select and direct digital delivery must never be enabled together for the same enrolled ebook.','catalog.manage',30),
('ACADEMY_LABS','Books & Learning','Manage Labs and Learning Inventory','Control labs without changing frozen book manuscripts.','Use Visibility & Inventory for Lab controls. Core Historical Lab IDs remain stable. Disable or hide a lab with the slider when needed. Supplemental labs can be registered with their own destination. Do not silently renumber or rewrite book-locked Lab IDs.','learning.manage',40),
('ACADEMY_MEMBERSHIPS','Commerce & Revenue','Memberships and Tool Passes','Understand tier precedence, countdowns, and à-la-carte access.','Free Membership is the base tier. Pick What You Want is created by active individual Tool Passes. Monthly, Annual, and Lifetime Memberships include the released Full Platform feature set. A higher active tier takes precedence over a lower grant. Use dated grants for promotions and testing.','plans.manage',50),
('ACADEMY_CHECKOUT','Commerce & Revenue','Activate Checkout and Payment Webhooks','Move from test readiness to production payments.','The website owns catalog, checkout presentation, orders, entitlements, renewals, and account access. The payment provider handles regulated card/payment rails. Configure the Lemon Squeezy API key, Store ID, webhook secret, and Variant IDs in Cloudflare/Admin. Test checkout and signed webhook processing before enabling the public checkout master switch.','commerce.manage',60),
('ACADEMY_ADS','Commerce & Revenue','Create and Operate Advertising','Sell side-income placements without contaminating trading decisions.','Create the advertiser, campaign, placement, and creative. Set dates, budgets, caps, audience, and disclosure. Keep ads out of Tutor answers, order-entry controls, risk warnings, and ENTER/WATCH/NO TRADE decision areas. Use plan-level frequency controls for Free, Pick What You Want, Monthly, Annual, and Lifetime members.','ads.manage',70),
('ACADEMY_COMMONS','Community','Operate The Ground-Up Market Commons','Moderate discussion and maintain high-signal sub-forums.','Use the Community section for sub-forums, reports, pinned official guides, hidden content, and member moderation. Keep discussions evidence-based. Do not allow pump coordination, guaranteed-return claims, harassment, doxxing, scams, or API keys in posts.','forum.moderate',80),
('ACADEMY_TOKENS','Accounts & Access','Member API Tokens and Connections','Support connections without ever seeing raw credentials.','Members add required provider credentials under Dashboard → Settings → Connections & API Keys. Credentials are encrypted server-side and are not readable in Admin. Staff can see connection status and last test result only. If a credential is compromised, instruct the member to rotate it with the provider and reconnect.','support.manage',90),
('ACADEMY_NAV','Site & Governance','Navigation and Visibility','Change public navigation without source edits.','Use Visibility & Inventory to enable or disable navigation items and content. Keep the top navigation intentionally compact: Learn, Tools, Market Commons, Store, and member profile. Put deep features in dropdowns and dashboard tabs instead of adding more top-level links.','settings.manage',100),
('ACADEMY_POLICIES','Site & Governance','Legal and Policy Publishing','Know which policies must stay synchronized with paid features.','Review Terms, Privacy, Subscription & Billing Terms, Refund/Cancellation, Educational Disclaimer, Advertising Disclosure, Community Guidelines, Cookie/Local Storage Notice, Accessibility, and Copyright/IP. Payment activation should not occur until business-specific legal terms have been reviewed.','compliance.manage',110),
('ACADEMY_RELEASE','Site & Governance','Release and Rollback Procedure','Deploy changes without losing a stable baseline.','Run migrations first, then verification SQL, then deploy the GitHub drop-in. Test authentication, member access, Admin, Store, checkout test mode, forum posting, dashboard tabs, and mobile layout. Preserve the previous known-good release and record the commit hash before enabling new production switches.','qa.manage',120),
('ACADEMY_SECURITY','Site & Governance','Security and Recovery','Protect secrets, roles, data, and emergency access.','Secrets belong in Cloudflare Secrets, never GitHub or browser code. Use least privilege. Keep at least one protected OWNER account. Audit critical actions. Rotate exposed credentials immediately. Preserve database backups and verify restoration procedures before paid launch.','system.view',130)
on conflict(lesson_code) do update set section=excluded.section,title=excluded.title,objective=excluded.objective,body_markdown=excluded.body_markdown,required_permission=excluded.required_permission,sort_order=excluded.sort_order,active=true,updated_at=now();

-- ============================================================
-- 6) MARKET COMMONS V2 — REAL SUB-FORUM ARCHITECTURE
-- ============================================================
create table if not exists public.commons_forums (
  forum_code text primary key,
  section_name text not null,
  name text not null,
  description text,
  active boolean not null default true,
  member_only boolean not null default true,
  book_code text,
  tool_code text,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now()
);

create table if not exists public.commons_topics (
  id bigint generated always as identity primary key,
  forum_code text not null references public.commons_forums(forum_code) on delete restrict,
  author_user_id uuid references public.profiles(id) on delete set null,
  author_label text,
  title text not null,
  body text not null,
  ticker text,
  status text not null default 'published',
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  is_official boolean not null default false,
  legacy_source_code text unique,
  reply_count integer not null default 0,
  view_count integer not null default 0,
  last_post_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commons_topics_forum_idx on public.commons_topics(forum_code,is_pinned desc,last_post_at desc);
create index if not exists commons_topics_ticker_idx on public.commons_topics(ticker,last_post_at desc);

create table if not exists public.commons_posts (
  id bigint generated always as identity primary key,
  topic_id bigint not null references public.commons_topics(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  author_label text,
  body text not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commons_posts_topic_idx on public.commons_posts(topic_id,created_at);

create table if not exists public.commons_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id bigint not null references public.commons_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,topic_id)
);

create table if not exists public.commons_topic_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id bigint not null references public.commons_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,topic_id)
);

alter table public.commons_forums enable row level security;
alter table public.commons_topics enable row level security;
alter table public.commons_posts enable row level security;
alter table public.commons_bookmarks enable row level security;
alter table public.commons_topic_subscriptions enable row level security;

drop policy if exists "members read commons forums" on public.commons_forums;
create policy "members read commons forums" on public.commons_forums for select to authenticated using(active=true);
drop policy if exists "members read commons topics" on public.commons_topics;
create policy "members read commons topics" on public.commons_topics for select to authenticated using(status='published' or author_user_id=auth.uid());
drop policy if exists "members read commons posts" on public.commons_posts;
create policy "members read commons posts" on public.commons_posts for select to authenticated using(status='published' or author_user_id=auth.uid());
drop policy if exists "users read own commons bookmarks" on public.commons_bookmarks;
create policy "users read own commons bookmarks" on public.commons_bookmarks for select to authenticated using(user_id=auth.uid());
drop policy if exists "users read own commons subscriptions" on public.commons_topic_subscriptions;
create policy "users read own commons subscriptions" on public.commons_topic_subscriptions for select to authenticated using(user_id=auth.uid());

revoke all on public.commons_forums,public.commons_topics,public.commons_posts,public.commons_bookmarks,public.commons_topic_subscriptions from anon,authenticated;
grant select on public.commons_forums,public.commons_topics,public.commons_posts,public.commons_bookmarks,public.commons_topic_subscriptions to authenticated;
grant all on public.commons_forums,public.commons_topics,public.commons_posts,public.commons_bookmarks,public.commons_topic_subscriptions to service_role;

insert into public.commons_forums(forum_code,section_name,name,description,book_code,tool_code,sort_order) values
('START_HERE','Getting Started & Help','Start Here & Site Help','Account setup, memberships, navigation, documentation, and getting started.',null,null,10),
('BILLING_ACCESS','Getting Started & Help','Memberships, Billing & Access','Questions about memberships, renewals, tool passes, book access, and checkout.',null,null,20),
('DATA_CONNECTIONS','Getting Started & Help','Data Connections & API Tokens','Help connecting personal market-data credentials and understanding data-source limits.',null,null,30),
('FOUNDATIONS_1','Books & Curriculum','Foundations Book I','Questions and discussion tied to Foundations Book I.','FOUNDATION_BOOK_1',null,110),
('FOUNDATIONS_2','Books & Curriculum','Foundations Book II','Questions and discussion tied to Foundations Book II.','FOUNDATION_BOOK_2',null,120),
('FOUNDATIONS_3','Books & Curriculum','Foundations Book III','Questions and discussion tied to Foundations Book III.','FOUNDATION_BOOK_3',null,130),
('DAY_TRADING_BOOK','Books & Curriculum','Day Trading','Curriculum discussion for the Day Trading branch.','DAY_TRADING_BOOK_1',null,140),
('READING_TAPE_BOOK','Books & Curriculum','Reading the Tape','Time & Sales, Level II, liquidity, queue mechanics, and order-flow curriculum.','READING_THE_TAPE',null,150),
('HISTORICAL_LABS','Learning & Practice','Historical Labs','Guided, Practice, Blind Decision, Assessment, and Historical Lab discussion.',null,'INTERACTIVE_LEARNING',210),
('SIMULATOR_REPLAY','Learning & Practice','Simulator & Replay','No-look-ahead replay, simulated execution, context envelopes, and review.',null,'MARKET_SIMULATOR',220),
('JOURNAL_ANALYTICS','Learning & Practice','Trading Journal & Analytics','Reason for entry/exit, MFE, MAE, R, expectancy, adherence, and review.',null,'JOURNAL_ANALYTICS',230),
('MARKET_TUTOR','Learning & Practice','Market Tutor','Concept questions, study recommendations, and Tutor feedback.',null,'MARKET_TUTOR',240),
('MARKET_STRUCTURE','Market Skills','Market Structure & Multi-Timeframe','HH/HL/LH/LL, ranges, breakouts, pullbacks, VWAP/EMA context, and timeframe alignment.',null,'MARKET_STRUCTURE_LAB',310),
('DISCOVERY_SCANNERS','Market Skills','Discovery, Scanners & Watchlists','Candidate discovery, scanner logic, qualification, and watchlist construction.',null,'DISCOVERY_LAB',320),
('CATALYST_FILINGS','Market Skills','Catalysts, Filings & Supply','Catalyst verification, SEC filings, float, dilution, offerings, warrants, and corporate actions.',null,'CATALYST_RESEARCH',330),
('RISK_EXECUTION','Market Skills','Risk, Sizing & Execution','Position sizing, stops, spread, slippage, order types, and execution decisions.',null,'RISK_POSITION_LAB',340),
('ORDER_FLOW_TAPE','Market Skills','Order Flow & Tape','Time & Sales, Level II, liquidity, displayed size, pace, and tape interpretation.',null,'ORDER_FLOW_TAPE_LAB',350),
('STRATEGY_VALIDATION','Market Skills','Strategy Validation','Sample size, expectancy, setup statistics, context, and evidence quality.',null,'STRATEGY_VALIDATION',360),
('OPTIONS_PLANNED','Market Skills','Options Learning & Simulator','Planned options curriculum: chains, Greeks, IV, contract selection, and simulation.',null,'OPTIONS_LAB',370),
('TRADE_REVIEW','Trader Discussion','Trade Reviews','Post complete context and review process, not blind trade calls.',null,'TRADE_REVIEW_REPLAY',410),
('MARKET_DISCUSSION','Trader Discussion','Market Discussion','General evidence-based market discussion that does not fit a narrower sub-forum.',null,null,420),
('QUESTIONS','Trader Discussion','Questions & Answers','Ask focused trading and platform questions with enough context to answer well.',null,null,430)
on conflict(forum_code) do update set section_name=excluded.section_name,name=excluded.name,description=excluded.description,book_code=excluded.book_code,tool_code=excluded.tool_code,sort_order=excluded.sort_order,active=true,updated_at=now();

-- Migrate/seed official discussion guides into the modern Commons when v0.12 official-post table exists.
do $$
begin
  if to_regclass('public.forum_official_posts') is not null then
    insert into public.commons_topics(forum_code,author_user_id,author_label,title,body,status,is_pinned,is_locked,is_official,legacy_source_code,created_at,updated_at,last_post_at)
    select
      case
        when fop.category ilike '%research%' then 'CATALYST_FILINGS'
        when fop.category ilike '%tape%' then 'ORDER_FLOW_TAPE'
        when fop.category ilike '%risk%' then 'RISK_EXECUTION'
        when fop.category ilike '%journal%' then 'JOURNAL_ANALYTICS'
        when fop.category ilike '%structure%' then 'MARKET_STRUCTURE'
        else 'START_HERE'
      end,
      null,fop.author_label,fop.title,fop.body,'published',fop.pinned,true,true,fop.post_code,
      coalesce(fop.created_at,now()),coalesce(fop.updated_at,now()),coalesce(fop.updated_at,fop.created_at,now())
    from public.forum_official_posts fop
    where fop.status='published' and fop.public_visible=true
    on conflict(legacy_source_code) do update set title=excluded.title,body=excluded.body,is_pinned=excluded.is_pinned,updated_at=excluded.updated_at;
  end if;
end $$;

create or replace function public.commons_create_topic(p_forum_code text,p_title text,p_body text,p_ticker text default null)
returns bigint
language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_id bigint; v_flag text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select auf.status into v_flag from public.admin_user_flags auf where auf.user_id=v_uid;
  if v_flag in ('restricted','suspended') then raise exception 'Posting is restricted for this account'; end if;
  if not exists(select 1 from public.commons_forums cf where cf.forum_code=p_forum_code and cf.active=true) then raise exception 'Forum is not available'; end if;
  if length(trim(coalesce(p_title,'')))<4 or length(trim(coalesce(p_body,'')))<10 then raise exception 'A clear title and discussion body are required'; end if;
  insert into public.commons_topics(forum_code,author_user_id,title,body,ticker)
  values(p_forum_code,v_uid,left(trim(p_title),180),left(trim(p_body),20000),nullif(left(upper(trim(coalesce(p_ticker,''))),16),'')) returning id into v_id;
  return v_id;
end;$$;

grant execute on function public.commons_create_topic(text,text,text,text) to authenticated;

create or replace function public.commons_create_reply(p_topic_id bigint,p_body text)
returns bigint
language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_id bigint; v_flag text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select auf.status into v_flag from public.admin_user_flags auf where auf.user_id=v_uid;
  if v_flag in ('restricted','suspended') then raise exception 'Posting is restricted for this account'; end if;
  if not exists(select 1 from public.commons_topics ct where ct.id=p_topic_id and ct.status='published' and ct.is_locked=false) then raise exception 'Topic is locked or unavailable'; end if;
  if length(trim(coalesce(p_body,'')))<2 then raise exception 'Reply cannot be empty'; end if;
  insert into public.commons_posts(topic_id,author_user_id,body) values(p_topic_id,v_uid,left(trim(p_body),20000)) returning id into v_id;
  update public.commons_topics set reply_count=reply_count+1,last_post_at=now(),updated_at=now() where id=p_topic_id;
  return v_id;
end;$$;
grant execute on function public.commons_create_reply(bigint,text) to authenticated;

create or replace function public.commons_toggle_bookmark(p_topic_id bigint)
returns boolean
language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.commons_bookmarks cb where cb.user_id=v_uid and cb.topic_id=p_topic_id) then
    delete from public.commons_bookmarks where user_id=v_uid and topic_id=p_topic_id; return false;
  end if;
  insert into public.commons_bookmarks(user_id,topic_id) values(v_uid,p_topic_id) on conflict do nothing; return true;
end;$$;
grant execute on function public.commons_toggle_bookmark(bigint) to authenticated;

-- ============================================================
-- 7) LEGAL / POLICY DOCUMENT REGISTRY
-- ============================================================
create table if not exists public.legal_documents (
  document_code text primary key,
  title text not null,
  slug text not null unique,
  body_markdown text not null,
  version text not null default '1.0',
  status text not null default 'published',
  effective_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.legal_documents enable row level security;
drop policy if exists "public reads published legal docs" on public.legal_documents;
create policy "public reads published legal docs" on public.legal_documents for select to anon,authenticated using(status='published');
revoke all on public.legal_documents from anon,authenticated;
grant select on public.legal_documents to anon,authenticated;
grant all on public.legal_documents to service_role;

insert into public.legal_documents(document_code,title,slug,body_markdown,version,status,effective_at) values
('TERMS','Terms of Service','terms','These Terms govern use of The Stock Market: From the Ground Up website, learning environment, community, and first-party platform tools. The platform provides educational information and simulation tools; it does not provide individualized investment advice, brokerage services, trade signals, or guaranteed outcomes. Users are responsible for account security, lawful use, trading decisions, and compliance with third-party data-provider terms. Paid access may include recurring memberships, individual Tool Passes, one-time Lifetime Membership, and book-linked companion access. Access can be suspended for fraud, abuse, security threats, unlawful activity, or serious community violations. Third-party market data, payment services, hosting, and connected APIs remain subject to their own terms and availability. Platform content, software, branding, original exercises, and first-party educational materials remain protected intellectual property.','1.0','published',now()),
('PRIVACY','Privacy Policy','privacy','We collect account information, authentication identifiers, learning progress, journal records you choose to save, purchase/subscription records, community activity, support records, and technical security data necessary to operate the service. Payment-card data is handled by the configured payment provider rather than stored by this website. Personal market-data API credentials are encrypted server-side and are not returned after storage. We use Cloudflare and Supabase infrastructure and may use a payment provider and market-data providers when those features are activated. Advertising analytics may record impressions and clicks. We use local storage/cookies for authentication, preferences, security, and session functions.','1.0','published',now()),
('SUBSCRIPTION','Subscription & Billing Terms','subscription-terms','Monthly and Annual Memberships renew according to the billing period shown at checkout until cancelled through the available billing controls. Pick What You Want access can consist of one or more separately purchased Tool Passes. Lifetime Membership is a one-time first-party platform access purchase and does not guarantee perpetual inclusion of third-party services that impose unavoidable per-user fees. Renewal dates, expiration dates, and active entitlements are shown in the Member Dashboard. Taxes and legally required charges are determined during checkout by the payment provider.','1.0','published',now()),
('REFUNDS','Refund & Cancellation Policy','refund-policy','Members can cancel recurring access so future renewals stop according to the payment provider and applicable law. Unless required by law or expressly stated otherwise at checkout, fees for digital access already delivered are generally non-refundable. Duplicate charges, billing errors, or technical access failures should be reported promptly through support so they can be investigated. Any provider-specific refund rights shown during checkout also apply.','1.0','published',now()),
('DISCLAIMER','Educational & Trading Disclaimer','educational-disclaimer','All books, labs, replays, simulator features, market-data displays, Tutor responses, journals, analytics, forum posts, and research tools are for education and self-directed practice. Nothing on the platform is a recommendation to buy, sell, short, hold, or trade any security or strategy. Historical results and simulated results do not guarantee future performance. Trading can result in substantial losses, including losses beyond an initial investment for some products or strategies. Verify information independently and use risk appropriate to your circumstances.','1.0','published',now()),
('COMMUNITY','Community Guidelines','community-guidelines','The Ground-Up Market Commons exists for evidence-based learning and discussion. Do not post pump-and-dump coordination, guaranteed-return claims, scams, phishing, harassment, private information, API keys, account credentials, unlawful content, spam, undisclosed promotion, or rumors presented as verified fact. Use the most relevant sub-forum, provide useful context, and distinguish observation from inference. Moderators may lock, hide, move, or remove content and may restrict accounts when necessary for safety and integrity.','1.0','published',now()),
('ADVERTISING','Advertising & Sponsorship Disclosure','advertising-disclosure','Paid placements are labeled as Advertisement or Sponsored content. Advertising does not control Market Tutor answers, Lab scoring, trading decisions, risk warnings, or editorial conclusions. Sponsor eligibility and placement are subject to platform review. Certain high-risk, deceptive, or inappropriate categories can be rejected. Ad frequency depends on membership tier.','1.0','published',now()),
('COOKIES','Cookie & Local Storage Notice','cookie-policy','The website uses browser storage and similar technologies for authentication sessions, remembered username/email preference, session-timeout settings, navigation state, advertising frequency controls, and other necessary preferences. We do not intentionally store account passwords in browser local storage. Browser settings can remove site data, but doing so may sign you out or reset preferences.','1.0','published',now()),
('ACCESSIBILITY','Accessibility Statement','accessibility','We aim to make the site usable with keyboard navigation, semantic controls, visible focus states, sufficient contrast, responsive layouts, reduced-motion preferences, and assistive technologies. If a feature creates an accessibility barrier, contact support with the page and problem so it can be reviewed.','1.0','published',now()),
('COPYRIGHT','Copyright & Intellectual Property Notice','copyright','First-party website software, branding, original instructional material, exercises, diagrams, datasets created for the platform, and J. S. Grant book content are protected by applicable intellectual-property law. Third-party names, market data, APIs, and trademarks remain the property of their respective owners. User posts remain subject to the platform Terms and community rules.','1.0','published',now())
on conflict(document_code) do update set title=excluded.title,slug=excluded.slug,body_markdown=excluded.body_markdown,version=excluded.version,status=excluded.status,effective_at=excluded.effective_at,updated_at=now();

do $$ begin if to_regclass('public.commons_topics_id_seq') is not null then execute 'grant usage,select on sequence public.commons_topics_id_seq to service_role'; end if; if to_regclass('public.commons_posts_id_seq') is not null then execute 'grant usage,select on sequence public.commons_posts_id_seq to service_role'; end if; end $$;

notify pgrst,'reload schema';



alter table public.catalog_products add column if not exists cover_image_url text;
alter table public.catalog_products add column if not exists sample_url text;

-- ============================================================
-- v0.13.1 FRONTEND EXPERIENCE PERSISTENCE
-- This section supports cross-device UI preferences, favorites, activity,
-- notifications, saved admin views, and future event producers.
-- ============================================================
create table if not exists public.user_ui_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  pref_key text not null,
  pref_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id,pref_key)
);
create table if not exists public.user_bookmarks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null default 'page',
  item_key text not null,
  title text not null,
  href text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,item_key)
);
create index if not exists user_bookmarks_user_created_idx on public.user_bookmarks(user_id,created_at desc);
create table if not exists public.user_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  title text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_activity_user_created_idx on public.user_activity_events(user_id,created_at desc);
create table if not exists public.user_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null default 'system',
  title text not null,
  body text,
  href text,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_idx on public.user_notifications(user_id,is_read,created_at desc);
create table if not exists public.admin_saved_views (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  context_code text not null,
  name text not null,
  view_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,context_code,name)
);

do $$ declare t text; begin
 foreach t in array array['user_ui_preferences','user_bookmarks','user_activity_events','user_notifications','admin_saved_views'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon,authenticated',t);
   execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

-- The browser uses Cloudflare authenticated API functions for these tables.
-- Direct browser table access remains denied.

grant usage,select on sequence public.user_bookmarks_id_seq to service_role;
grant usage,select on sequence public.user_activity_events_id_seq to service_role;
grant usage,select on sequence public.user_notifications_id_seq to service_role;
grant usage,select on sequence public.admin_saved_views_id_seq to service_role;

insert into public.site_settings(setting_key,category,value,public_read,description) values
('site.version','site','"0.13.1"'::jsonb,true,'Current public website version.'),
('ui.command_palette','ui','true'::jsonb,true,'Enable global command/search palette.'),
('ui.notifications','ui','true'::jsonb,true,'Enable in-app notification center.'),
('ui.onboarding','ui','true'::jsonb,true,'Enable role-aware onboarding.'),
('ui.bookmarks','ui','true'::jsonb,true,'Enable favorites and saved items.'),
('ui.offline_shell','ui','true'::jsonb,true,'Enable safe static-shell offline fallback.'),
('ui.admin_environment_banner','ui','true'::jsonb,false,'Show environment and build identifier in Admin.')
on conflict(setting_key) do update set value=excluded.value,description=excluded.description,updated_at=now();

-- Seed a welcome notification for the OWNER only if no notification exists yet.
do $$ declare v_owner uuid; begin
 select id into v_owner from auth.users where lower(email)=lower('stockmarketfromthegroundup@gmail.com') limit 1;
 if v_owner is not null and not exists(select 1 from public.user_notifications where user_id=v_owner and metadata->>'seed'='v0131') then
   insert into public.user_notifications(user_id,notification_type,title,body,href,metadata)
   values(v_owner,'system','v0.13.1 frontend completion ready','Review Dashboard, Admin navigation, Store, Market Commons, Help, and checkout preview after deployment.','/dashboard.html','{"seed":"v0131"}'::jsonb);
 end if;
end $$;

notify pgrst,'reload schema';
