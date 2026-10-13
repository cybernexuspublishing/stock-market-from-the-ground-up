-- v0.13.4 — Skill Development, Account Operations, Showcase Mode, Navigation Polish
-- Baseline: deployed v0.13.3.
-- Additive/idempotent. Run before deploying v0.13.4 application code.

begin;

-- ============================================================
-- 1. COMPETENCY INTELLIGENCE
-- Scores represent assessment evidence, never mere completion.
-- ============================================================
create table if not exists public.competency_definitions (
  competency_code text primary key,
  category text not null,
  name text not null,
  description text not null,
  mastery_definition text,
  pass_score numeric(5,2) not null default 80 check(pass_score between 0 and 100),
  mastery_score numeric(5,2) not null default 90 check(mastery_score between 0 and 100),
  minimum_evidence integer not null default 10 check(minimum_evidence >= 1),
  sort_order integer not null default 100,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competency_evidence (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  competency_code text not null references public.competency_definitions(competency_code) on delete restrict,
  source_type text not null check(source_type in ('lab','quiz','simulator','journal_review','capstone','instructor_review','system_assessment')),
  source_id text not null,
  dimension text not null check(dimension in ('knowledge','recognition','decision','process')),
  score numeric(5,2) not null check(score between 0 and 100),
  passed boolean not null default false,
  critical_error boolean not null default false,
  difficulty text,
  weight numeric(6,3) not null default 1 check(weight > 0 and weight <= 20),
  metadata jsonb not null default '{}'::jsonb,
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id,competency_code,source_type,source_id,dimension)
);
create index if not exists competency_evidence_user_skill_idx on public.competency_evidence(user_id,competency_code,assessed_at desc);
create index if not exists competency_evidence_user_time_idx on public.competency_evidence(user_id,assessed_at desc);

alter table public.competency_definitions enable row level security;
alter table public.competency_evidence enable row level security;
drop policy if exists "members read competency definitions" on public.competency_definitions;
create policy "members read competency definitions" on public.competency_definitions for select to authenticated using(active=true);
drop policy if exists "members read own competency evidence" on public.competency_evidence;
create policy "members read own competency evidence" on public.competency_evidence for select to authenticated using(auth.uid()=user_id);
revoke all on public.competency_definitions,public.competency_evidence from anon,authenticated;
grant select on public.competency_definitions,public.competency_evidence to authenticated;
grant all on public.competency_definitions,public.competency_evidence to service_role;
grant usage,select on sequence public.competency_evidence_id_seq to service_role;

insert into public.competency_definitions(competency_code,category,name,description,mastery_definition,pass_score,mastery_score,minimum_evidence,sort_order,metadata) values
('CHART_STRUCTURE','Core Chart Reading','Chart Structure','Read trend, ranges, HH/HL/LH/LL, support, resistance, gaps, and structural failure without hindsight.','Consistently identifies structure and invalidation across unseen cases.',80,90,12,10,'{"keywords":["chart structure","hh","hl","lh","ll","support","resistance","trend","range"],"tool_keywords":["market structure","multi-timeframe"],"mastery_pass_streak":3}'::jsonb),
('CANDLE_READING','Core Chart Reading','Candlestick Reading','Interpret body, wick, close location, range, sequence, and context without treating one candle as a complete signal.','Accurately reads candle evidence in sequence across unseen cases.',80,90,12,20,'{"keywords":["candlestick","candle","wick","body","doji","sequence"],"mastery_pass_streak":3}'::jsonb),
('VWAP_CONTEXT','Core Chart Reading','VWAP Context','Use VWAP as context for location, hold, reclaim, rejection, and failure rather than as a standalone entry signal.','Correctly distinguishes VWAP states and integrates them with structure and volume.',80,90,15,30,'{"keywords":["vwap","reclaim","rejection","hold"],"mastery_pass_streak":3}'::jsonb),
('EMA_CONTEXT','Core Chart Reading','EMA Context','Read price relative to EMA9/EMA20 and EMA relationships as trend/context evidence.','Uses EMA context without substituting it for trigger, invalidation, or structure.',80,90,12,40,'{"keywords":["ema","ema9","ema20","moving average"],"mastery_pass_streak":3}'::jsonb),
('VOLUME_ANALYSIS','Core Chart Reading','Volume Analysis','Distinguish expansion, acceleration, contraction, exhaustion, and low-quality participation in context.','Correctly classifies volume behavior and its limits across unseen cases.',80,90,15,50,'{"keywords":["volume","rvol","acceleration","exhaustion","contraction"],"mastery_pass_streak":3}'::jsonb),
('MULTI_TIMEFRAME','Core Chart Reading','Multi-Timeframe Agreement','Synthesize 5-minute structure, 3-minute confirmation, and 1-minute timing without allowing the lower timeframe to override higher-timeframe context.','Produces consistent, complete multi-timeframe syntheses across unseen cases.',80,90,12,60,'{"keywords":["multi-timeframe","timeframe","1-minute","3-minute","5-minute"],"tool_keywords":["multi-timeframe"],"mastery_pass_streak":3}'::jsonb),
('BREAKOUT_RECOGNITION','Setups & Price Action','Breakout Recognition','Recognize a valid breakout attempt, its level, required confirmation, extension risk, and invalidation.','Classifies valid versus weak breakout attempts and states the trigger/invalidation before outcome.',80,90,15,100,'{"keywords":["breakout","high of day","hod","resistance break","range break"],"tool_keywords":["scanner","simulator"],"mastery_pass_streak":5}'::jsonb),
('FAILED_BREAKOUT','Setups & Price Action','Failed Breakout Recognition','Recognize when price loses the breakout premise, cannot hold the level, or shows rejection/failure evidence.','Rejects or exits failed breakout conditions without outcome-based rewriting.',80,90,15,110,'{"keywords":["failed breakout","false breakout","failure","rejection"],"mastery_pass_streak":5}'::jsonb),
('PULLBACK_RECOGNITION','Setups & Price Action','Pullback Recognition','Differentiate an orderly pullback from breakdown, chop, or premature anticipation.','Correctly identifies pullback structure, support, trigger, and failure conditions.',80,90,15,120,'{"keywords":["pullback","dip","higher low","retracement"],"mastery_pass_streak":5}'::jsonb),
('HOD_PM_LEVELS','Setups & Price Action','HOD / PMH / PDH Levels','Use HOD, premarket high, previous-day high, and related reference levels as context rather than automatic signals.','Correctly evaluates level quality, confirmation, and failed attempts.',80,90,12,130,'{"keywords":["hod","high of day","pmh","premarket high","pdh","previous day high","dollar cross"],"mastery_pass_streak":3}'::jsonb),
('RCT_RECOGNITION','Setups & Price Action','RCT / Red Candle Theory Recognition','Recognize the defined RCT pattern at recognition level and distinguish it from unrelated red candles.','Classifies qualifying and non-qualifying cases consistently.',80,90,12,140,'{"keywords":["rct","red candle theory","first red candle"],"mastery_pass_streak":3}'::jsonb),
('SQUEEZE_CONTEXT','Setups & Price Action','Squeeze / Extension Context','Identify squeeze conditions, parabolic extension, frontside/backside state, and when new-long risk increases.','Correctly classifies squeeze/extension state and avoids forced entries.',80,90,12,150,'{"keywords":["squeeze","parabolic","frontside","backside","extension","panic"],"mastery_pass_streak":3}'::jsonb),
('RISK_PER_SHARE','Risk & Execution','Risk Per Share','Calculate entry-to-invalidation risk per share correctly before sizing.','Produces correct arithmetic without entering before risk is defined.',100,100,20,200,'{"keywords":["risk per share","invalidation","stop distance"],"mastery_pass_streak":5}'::jsonb),
('POSITION_SIZING','Risk & Execution','Position Sizing','Translate max dollar risk and risk per share into position size while respecting liquidity and execution constraints.','Maintains 100% arithmetic accuracy and rejects infeasible size.',100,100,20,210,'{"keywords":["position sizing","shares","max dollar risk","size"],"mastery_pass_streak":5}'::jsonb),
('RISK_REWARD','Risk & Execution','Planned Risk / Reward','Calculate planned reward-to-risk before entry and distinguish planned R from realized outcome.','Correctly computes and interprets R:R across unseen cases.',100,100,20,220,'{"keywords":["risk reward","reward-to-risk","r:r","target"],"mastery_pass_streak":5}'::jsonb),
('ORDER_SELECTION','Risk & Execution','Order Selection','Choose market, limit, stop, and related order behavior based on execution objective and risk.','Selects appropriate order logic without critical execution-risk errors.',85,95,15,230,'{"keywords":["order type","market order","limit order","stop order","execution"],"mastery_pass_streak":5}'::jsonb),
('SLIPPAGE_SPREAD','Risk & Execution','Spread & Slippage','Recognize when spread, liquidity, volatility, or size makes theoretical risk unrealistic.','Consistently adjusts or rejects trades when execution cost invalidates the plan.',85,95,15,240,'{"keywords":["spread","slippage","liquidity","bid ask","bid-ask"],"tool_keywords":["liquidity","execution"],"mastery_pass_streak":5}'::jsonb),
('CATALYST_ANALYSIS','Research & Quality','Catalyst Analysis','Verify the catalyst, source, timing, materiality, and uncertainty instead of trading a headline label.','Correctly classifies catalyst quality and identifies what remains unknown.',80,90,15,300,'{"keywords":["catalyst","news","earnings","press release","filing"],"tool_keywords":["catalyst","filing","research"],"mastery_pass_streak":3}'::jsonb),
('FLOAT_SUPPLY','Research & Quality','Float & Supply Analysis','Evaluate float estimates, effective supply, dilution pathways, rotation, and the limits of unverified float data.','Uses supply evidence without treating float as a static or perfectly known number.',80,90,15,310,'{"keywords":["float","supply","rotation","dilution","warrant","offering","atm","shelf"],"tool_keywords":["float","supply"],"mastery_pass_streak":3}'::jsonb),
('SEC_FILINGS','Research & Quality','SEC Filing Analysis','Locate and interpret relevant filings for offerings, dilution, capital structure, risk, and corporate events.','Finds the relevant filing and separates disclosed facts from inference.',80,90,15,320,'{"keywords":["sec","10-k","10-q","8-k","s-1","s-3","424b","filing","dilution"],"tool_keywords":["filing","research"],"mastery_pass_streak":3}'::jsonb),
('CANDIDATE_QUALITY','Research & Quality','Candidate Quality','Combine catalyst, volume/RVOL, supply, liquidity, spread, history, and setup state to qualify or reject a candidate.','Correctly ranks candidates and makes disciplined rejection decisions.',80,90,15,330,'{"keywords":["candidate","quality","rvol","former runner","watchlist","scanner","qualification"],"tool_keywords":["discovery","scanner","watchlist"],"mastery_pass_streak":3}'::jsonb),
('MARKET_REGIME','Research & Quality','Market Regime','Classify relevant market environment and understand when a setup behaves differently across regimes.','Correctly labels regime/context without forcing a setup.',80,90,12,340,'{"keywords":["market regime","context","sector","index","volatility regime"],"mastery_pass_streak":3}'::jsonb),
('TAPE_READING','Microstructure & Tape','Time & Sales / Tape Reading','Read print pace, size, price location, and changing participation without inventing intent from prints.','Uses tape evidence cautiously and consistently with price/structure.',80,90,15,400,'{"keywords":["time & sales","time and sales","tape","prints","pace"],"tool_keywords":["tape","order flow"],"mastery_pass_streak":5}'::jsonb),
('LEVEL2_READING','Microstructure & Tape','Level II / Order Book','Read displayed bid/ask depth, changes, and limitations without treating displayed liquidity as guaranteed intent.','Integrates Level II with tape and price while avoiding unsupported inference.',80,90,15,410,'{"keywords":["level ii","level 2","order book","depth","bid","ask"],"tool_keywords":["order flow","liquidity"],"mastery_pass_streak":5}'::jsonb),
('HALTS_LULD','Microstructure & Tape','Halts / LULD / Reopening Risk','Recognize volatility pauses, LULD context, reopening uncertainty, and the execution risk around halts.','Makes no critical halt/LULD risk errors across unseen cases.',90,95,12,420,'{"keywords":["halt","luld","limit up","limit down","reopening"],"mastery_pass_streak":5}'::jsonb),
('ENTER_WATCH_NO_TRADE','Decision Process','ENTER / WATCH / NO TRADE','Make a process-valid decision from evidence available at the decision boundary without being rewarded for hindsight.','Produces consistent process-valid decisions with explicit reasoning and invalidation.',85,95,15,500,'{"keywords":["enter","watch","no trade","decision","decision boundary"],"mastery_pass_streak":5}'::jsonb),
('INVALIDATION_DISCIPLINE','Decision Process','Defined Invalidation','State objective invalidation before entry and respond when the premise fails.','Every proposed entry contains a coherent, observable invalidation.',90,100,15,510,'{"keywords":["invalidation","stop","premise","failure condition"],"mastery_pass_streak":5}'::jsonb),
('CHASE_FOMO_DISCIPLINE','Decision Process','Chase / FOMO Discipline','Recognize excessive extension, late entry, emotional urgency, and when passing is the correct action.','Avoids anticipation/chasing and accepts WATCH/NO TRADE when evidence is insufficient.',85,95,15,520,'{"keywords":["chase","fomo","extended","late entry","discipline","no trade"],"mastery_pass_streak":5}'::jsonb),
('MFE_MAE_REVIEW','Decision Process','MFE / MAE / Review','Measure favorable/adverse excursion and review process without rewriting the original decision after outcome is known.','Produces reproducible MFE/MAE and process review with no look-ahead contamination.',85,95,12,530,'{"keywords":["mfe","mae","review","journal","expectancy","outcome"],"tool_keywords":["journal","review"],"mastery_pass_streak":3}'::jsonb),
('INDEPENDENT_PLAN','Decision Process','Independent Trade Planning','Build a complete plan—context, trigger, invalidation, size, management, and NO TRADE criteria—without AI supplying the decision.','Completes consecutive independent sessions with no critical-control failures.',90,95,12,540,'{"keywords":["trade plan","independent","plan","watchlist","invalidation","management"],"tool_keywords":["trade-plan","watchlist"],"mastery_pass_streak":4}'::jsonb)
on conflict(competency_code) do update set
  category=excluded.category,name=excluded.name,description=excluded.description,mastery_definition=excluded.mastery_definition,
  pass_score=excluded.pass_score,mastery_score=excluded.mastery_score,minimum_evidence=excluded.minimum_evidence,
  sort_order=excluded.sort_order,active=true,metadata=excluded.metadata,updated_at=now();

-- ============================================================
-- 2. TEST/SHOWCASE CREDENTIAL VAULT
-- Stores only passwords generated for disposable test/showcase accounts.
-- Never store or reveal real member passwords.
-- ============================================================
create table if not exists public.test_account_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  key_version text not null default 'v1',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.test_account_credentials enable row level security;
revoke all on public.test_account_credentials from anon,authenticated;
grant all on public.test_account_credentials to service_role;

-- ============================================================
-- 3. SHOWCASE ACCOUNT TYPE + READ-ONLY ROLE
-- ============================================================
do $$ begin
  if exists(select 1 from pg_constraint where conname='profiles_account_kind_check') then
    alter table public.profiles drop constraint profiles_account_kind_check;
  end if;
  alter table public.profiles add constraint profiles_account_kind_check check(account_kind in ('member','test','showcase'));
exception when duplicate_object then null;
end $$;

insert into public.admin_roles(role_code,name,description,priority,is_system,is_assignable,updated_at)
values('SHOWCASE_VIEWER','Showcase Viewer','Read-only frontend showcase role. Admin data is synthetic; production mutations are blocked server-side.',90,true,true,now())
on conflict(role_code) do update set name=excluded.name,description=excluded.description,priority=excluded.priority,is_assignable=true,updated_at=now();

insert into public.admin_role_permissions(role_code,permission_code)
select 'SHOWCASE_VIEWER',permission_code from public.admin_permissions
where permission_code not in ('owner.manage','users.delete')
on conflict do nothing;

-- Critical owner/destructive authority is never assigned. The application server additionally
-- blocks every showcase mutation and substitutes synthetic data for production reads.
delete from public.admin_role_permissions
where role_code='SHOWCASE_VIEWER' and permission_code in ('owner.manage','users.delete');

insert into public.qa_account_presets(preset_code,label,description,plan_code,tool_codes,book_codes,metadata,active,sort_order)
values('SHOWCASE','Frontend Showcase Viewer','All member-facing access plus a synthetic, read-only Admin Control Center for demonstrations.','LIFETIME',array[]::text[],array[]::text[],'{"showcase":true,"synthetic_admin_data":true}'::jsonb,true,90)
on conflict(preset_code) do update set label=excluded.label,description=excluded.description,plan_code=excluded.plan_code,metadata=excluded.metadata,active=true,sort_order=excluded.sort_order;

insert into public.site_feature_controls(feature_code,label,category,enabled,description)
values('SKILL_DEVELOPMENT_ENABLED','Skill Development','learning',true,'Display evidence-based competency scores, weakness diagnosis, and targeted remediation resources.')
on conflict(feature_code) do update set label=excluded.label,category=excluded.category,enabled=excluded.enabled,description=excluded.description;

insert into public.site_settings(setting_key,category,value,public_read,description)
values('site.version','site','"0.13.4"'::jsonb,true,'Current public website version.')
on conflict(setting_key) do update set value=excluded.value,updated_at=now();

commit;
