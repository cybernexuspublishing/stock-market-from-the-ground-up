-- v0.13.2 — Live UI Consolidation & Production Completion
-- Baseline: deployed v0.13.1 Advanced Frontend Completion.
-- This migration is intentionally additive/idempotent. Routine operations should
-- be performed through the Admin Control Center after this migration.

begin;

-- ============================================================
-- 1. PRIVATE ACCOUNT IDENTITY / AGE ELIGIBILITY
-- ============================================================
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists account_kind text not null default 'member';
alter table public.profiles add column if not exists deleted_at timestamptz;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='profiles_account_kind_check') then
    alter table public.profiles add constraint profiles_account_kind_check check(account_kind in ('member','test'));
  end if;
end $$;

create table if not exists public.account_private_identity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  age_eligible boolean not null,
  age_eligibility_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.account_private_identity enable row level security;
revoke all on public.account_private_identity from anon,authenticated;
grant all on public.account_private_identity to service_role;

create table if not exists public.account_deletion_events (
  id bigint generated always as identity primary key,
  subject_user_id uuid,
  actor_user_id uuid,
  account_kind text,
  reason text,
  confirmation_phrase text not null,
  retained_record_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.account_deletion_events enable row level security;
revoke all on public.account_deletion_events from anon,authenticated;
grant all on public.account_deletion_events to service_role;

-- ============================================================
-- 2. SUPPORT TICKET QUEUE
-- ============================================================
create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  ticket_number text not null unique default ('SUP-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(md5(random()::text||clock_timestamp()::text),1,8))),
  requester_user_id uuid references auth.users(id) on delete set null,
  category text not null default 'other',
  subject text not null,
  description text not null,
  status text not null default 'new',
  priority text not null default 'normal',
  assigned_user_id uuid references auth.users(id) on delete set null,
  related_order_id bigint,
  related_product_code text,
  tags text[] not null default array[]::text[],
  last_member_reply_at timestamptz,
  last_staff_reply_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists(select 1 from pg_constraint where conname='support_tickets_status_check') then
    alter table public.support_tickets add constraint support_tickets_status_check check(status in ('new','open','assigned','waiting_member','waiting_staff','escalated','resolved','closed'));
  end if;
  if not exists(select 1 from pg_constraint where conname='support_tickets_priority_check') then
    alter table public.support_tickets add constraint support_tickets_priority_check check(priority in ('low','normal','high','urgent'));
  end if;
end $$;

create table if not exists public.support_ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_kind text not null default 'member',
  body text not null,
  is_internal boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists(select 1 from pg_constraint where conname='support_ticket_messages_author_kind_check') then
    alter table public.support_ticket_messages add constraint support_ticket_messages_author_kind_check check(author_kind in ('member','staff','system'));
  end if;
end $$;

create index if not exists support_tickets_requester_idx on public.support_tickets(requester_user_id,status,updated_at desc);
create index if not exists support_tickets_queue_idx on public.support_tickets(status,priority,updated_at desc);
create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages(ticket_id,created_at);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
revoke all on public.support_tickets,public.support_ticket_messages from anon,authenticated;
grant all on public.support_tickets,public.support_ticket_messages to service_role;

-- ============================================================
-- 3. SITE ANNOUNCEMENTS / FEATURE CONTROLS / QA ACCEPTANCE
-- ============================================================
create table if not exists public.site_announcements (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null,
  announcement_type text not null default 'info',
  audience text not null default 'all',
  starts_at timestamptz,
  ends_at timestamptz,
  dismissible boolean not null default true,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.site_feature_controls (
  feature_code text primary key,
  label text not null,
  category text not null default 'platform',
  enabled boolean not null default true,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.qa_acceptance_items (
  item_code text primary key,
  label text not null,
  category text not null,
  status text not null default 'untested',
  notes text,
  tested_by uuid references auth.users(id) on delete set null,
  tested_at timestamptz,
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists(select 1 from pg_constraint where conname='qa_acceptance_items_status_check') then
    alter table public.qa_acceptance_items add constraint qa_acceptance_items_status_check check(status in ('untested','pass','fail','retest_required'));
  end if;
end $$;

alter table public.site_announcements enable row level security;
alter table public.site_feature_controls enable row level security;
alter table public.qa_acceptance_items enable row level security;
revoke all on public.site_announcements,public.site_feature_controls,public.qa_acceptance_items from anon,authenticated;
grant all on public.site_announcements,public.site_feature_controls,public.qa_acceptance_items to service_role;

insert into public.site_feature_controls(feature_code,label,category,enabled,description) values
('MAINTENANCE_MODE','Maintenance Mode','system',false,'Temporarily place public member surfaces into maintenance mode while preserving staff access.'),
('REGISTRATION_ENABLED','New Account Registration','accounts',true,'Allow eligible users age 18+ to create accounts.'),
('CHECKOUT_ENABLED','Public Checkout','commerce',false,'Master public website checkout switch.'),
('COMMONS_POSTING_ENABLED','Market Commons Posting','community',true,'Allow members to create topics and replies.'),
('SIMULATOR_ENABLED','Market Simulator','tools',true,'Expose the simulator to entitled members.'),
('TUTOR_ENABLED','Market Tutor','tools',true,'Expose the Market Tutor to entitled members.'),
('ADS_ENABLED','Advertising','advertising',true,'Allow approved sponsor inventory to serve under plan policy.'),
('BOOK_KEY_REDEMPTION_ENABLED','Book Key Redemption','books',true,'Allow members to redeem qualifying Book Keys.'),
('PUBLIC_STORE_ENABLED','Public Store','commerce',true,'Expose the Store publicly.'),
('SUPPORT_ENABLED','Support Ticket System','support',true,'Allow members to create and reply to support tickets.')
on conflict(feature_code) do update set label=excluded.label,category=excluded.category,description=excluded.description;

insert into public.qa_acceptance_items(item_code,label,category) values
('AUTH','Authentication','Member Experience'),('DASHBOARD','Dashboard','Member Experience'),('MEMBERSHIP','Membership & Access','Member Experience'),('STORE','Store','Commerce'),('BOOKS','Books','Commerce'),('CHECKOUT','Checkout','Commerce'),('COMMONS','Market Commons','Community'),('LABS','Historical Labs','Learning'),('JOURNAL','Journal','Trading Tools'),('SIMULATOR','Simulator','Trading Tools'),('TUTOR','Market Tutor','Learning'),('DOCS','Documentation','Support'),('NOTIFICATIONS','Notifications','Member Experience'),('ADVERTISING','Advertising','Revenue'),('POLICIES','Policies','Governance'),('ADMIN','Admin Control Center','Operations'),('MOBILE','Responsive/Mobile','Quality'),('ACCESSIBILITY','Accessibility','Quality')
on conflict(item_code) do nothing;

-- ============================================================
-- 4. TEST ACCOUNT METADATA & PRESETS
-- ============================================================
create table if not exists public.test_account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preset_code text not null,
  label text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.qa_account_presets (
  preset_code text primary key,
  label text not null,
  description text,
  plan_code text,
  tool_codes text[] not null default array[]::text[],
  book_codes text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 100
);
alter table public.test_account_profiles enable row level security;
alter table public.qa_account_presets enable row level security;
revoke all on public.test_account_profiles,public.qa_account_presets from anon,authenticated;
grant all on public.test_account_profiles,public.qa_account_presets to service_role;

insert into public.qa_account_presets(preset_code,label,description,plan_code,tool_codes,metadata,sort_order) values
('NEW_FREE','New Free User','Fresh account with no paid entitlements.','FREE',array[]::text[],'{"state":"new"}'::jsonb,10),
('PICK','Pick What You Want','Individual Journal + Simulator tool passes.','PICK_WHAT_YOU_WANT',array['JOURNAL_ANALYTICS','MARKET_SIMULATOR']::text[],'{}'::jsonb,20),
('MONTHLY','Monthly Member','Full Monthly Membership.','FULL_MONTHLY',array[]::text[],'{}'::jsonb,30),
('ANNUAL','Annual Member','Full Annual Membership.','FULL_ANNUAL',array[]::text[],'{}'::jsonb,40),
('LIFETIME','Lifetime Member','Permanent first-party platform access.','LIFETIME',array[]::text[],'{}'::jsonb,50),
('TRIAL','Trial User','Time-limited Full Platform trial.','BOOK_TRIAL',array[]::text[],'{"days":30}'::jsonb,60),
('EXPIRED','Expired Member','Expired access state for regression testing.','FULL_MONTHLY',array[]::text[],'{"expired":true}'::jsonb,70),
('HEAVY','Heavy User','High-activity member for dense-state testing.','FULL_ANNUAL',array[]::text[],'{"seed_activity":true}'::jsonb,80)
on conflict(preset_code) do update set label=excluded.label,description=excluded.description,plan_code=excluded.plan_code,tool_codes=excluded.tool_codes,metadata=excluded.metadata,active=true,sort_order=excluded.sort_order;

-- ============================================================
-- 5. MEMBER PRIVACY / CONSENT PREFERENCES
-- ============================================================
create table if not exists public.member_consent_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  analytics boolean not null default false,
  advertising_personalization boolean not null default false,
  marketing_email boolean not null default false,
  community_email boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.member_consent_preferences enable row level security;
revoke all on public.member_consent_preferences from anon,authenticated;
grant all on public.member_consent_preferences to service_role;

-- ============================================================
-- 6. SEARCHABLE MEMBER ACTIVITY DIRECTORY
-- ============================================================
create or replace view public.admin_member_activity_directory as
select
  a.id,
  a.user_id,
  p.username,
  p.email,
  a.activity_type,
  a.title,
  a.href,
  a.metadata,
  a.created_at
from public.user_activity_events a
left join public.profiles p on p.id=a.user_id;
revoke all on public.admin_member_activity_directory from anon,authenticated;
grant select on public.admin_member_activity_directory to service_role;

-- ============================================================
-- 7. LEGAL DOCUMENTS — EXPANDED OPERATIVE BASELINE
-- These remain business drafts requiring licensed legal review before paid launch.
-- ============================================================
update public.legal_documents set body_markdown=$$## 1. Acceptance and Eligibility
These Terms govern access to and use of The Stock Market: From the Ground Up website, member learning environment, Market Commons, simulations, journals, research tools, downloadable/exportable account records, and first-party services operated under the Crown & Lantern Press imprint. You must be at least 18 years old to create an account, purchase a membership, buy a website product, or use member-only services. By creating an account or using the service, you represent that information you provide is accurate and that you meet the eligibility requirements.

## 2. Educational Purpose; No Investment Advice
The service is educational. It does not act as a broker-dealer, investment adviser, fiduciary, signal service, or portfolio manager and does not provide individualized recommendations. Historical examples, replays, simulations, Market Tutor responses, journal analytics, forum discussions, and research tools are not instructions to buy, sell, short, hold, or trade a security. You are solely responsible for your trading and financial decisions.

## 3. Accounts and Security
You are responsible for maintaining the confidentiality of your password and connected-provider credentials and for activity conducted through your account. Do not share API tokens, passwords, or private account information in Market Commons, screenshots, support tickets, or public content. We may require reauthentication for sensitive actions. Accounts may be suspended or restricted for suspected fraud, security threats, unlawful conduct, payment abuse, or serious violations of these Terms or Community Guidelines.

## 4. Memberships, Tool Passes and Book Access
Access may include Free Membership, Pick What You Want tool access, Monthly Membership, Annual Membership, Lifetime Membership, trials, and book-linked companion access. Features included in a membership are shown in the Member Dashboard and may evolve as the platform changes. Lifetime Membership means ongoing access to first-party platform features included in that tier; it does not guarantee that third-party services with unavoidable separate licensing or per-user charges will always be included without additional terms.

## 5. Purchases and Billing
Prices, billing periods, renewal terms, taxes, and cancellation information are shown before checkout. Recurring memberships renew until cancelled as described at checkout and in the Subscription & Billing Terms. Payment processing may be handled by a third-party payment provider or Merchant of Record. We do not intentionally store full payment-card numbers on this website.

## 6. Book Distribution and KDP Select
Amazon purchase links and direct-site channels are separate distribution methods. Where a digital title is enrolled in KDP Select or another exclusivity program, the platform may technically block direct digital distribution for that title. Companion learning resources are not a substitute digital copy of the enrolled book.

## 7. Market Data and Connected Services
Market-data coverage, timing, exchange scope, historical depth, and availability depend on the applicable provider. Bring-your-own API credentials remain subject to the provider's terms. You must have the right to use any credential you connect. Data may be delayed, incomplete, adjusted, corrected, unavailable, or limited by provider rights. The platform may suspend an integration when continued use would violate provider terms or licensing requirements.

## 8. Community Content
You retain responsibility for material you post. By submitting content to Market Commons or support, you grant the service a non-exclusive license to host, display, process, moderate, and reproduce that content as necessary to operate the service. Prohibited content and moderation standards are described in the Community Guidelines.

## 9. Intellectual Property
First-party software, branding, user-interface designs, original exercises, learning activities, diagrams, documentation, and J. S. Grant book content are protected by applicable intellectual-property law. No purchase transfers ownership of intellectual property. Third-party trademarks, market data, APIs, and services remain the property of their owners.

## 10. Availability and Changes
We work to provide a reliable service but do not guarantee uninterrupted availability. Maintenance, security incidents, third-party failures, data-provider outages, legal requirements, or technical changes may temporarily affect features. Material changes to paid access will be communicated through the platform when reasonably practicable.

## 11. Termination and Account Deletion
You may request account deletion from Dashboard Settings. Deleting an account does not necessarily require deletion of records that must be retained for payment, tax, fraud-prevention, dispute, security, legal, or audit purposes. Retained records are minimized where appropriate and no longer operate as an active member account.

## 12. Disclaimers and Limitation
Trading involves risk and losses can be substantial. Simulated results and historical outcomes do not guarantee future results. To the maximum extent permitted by applicable law, the service is provided without guarantees of trading profitability, uninterrupted third-party data, or suitability for a particular financial objective. Nothing in these Terms limits rights that cannot lawfully be limited.

## 13. Governing Terms and Contact
These Terms operate together with the Privacy Policy, Subscription & Billing Terms, Refund & Cancellation Policy, Educational & Trading Disclaimer, Community Guidelines, Advertising Disclosure, Cookie & Local Storage Notice, Accessibility Statement, and Copyright Notice. Questions or legal notices should be submitted through the platform support system or the published business contact channel.$$,
version='1.1',updated_at=now() where document_code='TERMS';

update public.legal_documents set body_markdown=$$## Information We Collect
We collect information needed to operate accounts and services, including username, email address, first and last name, age-eligibility information, learning progress, saved journal/simulator records, purchases and subscription state, support requests, community activity, security events, preferences, and technical information necessary to secure and operate the service. Date of birth is treated as restricted account information and is not intended for public profile display.

## Why We Use Information
We use information to authenticate users, enforce the 18+ eligibility rule, deliver purchased or granted access, operate learning and trading-practice tools, secure accounts, provide customer support, process commerce, maintain audit/security records, improve reliability, and comply with legal obligations.

## Payment Information
Payment-card information is handled by the configured payment processor or Merchant of Record. The platform may store order identifiers, amounts, status, tax, subscription state, and receipt metadata but does not intentionally store full card numbers.

## Connected API Credentials
Personal market-data/API credentials are submitted through authenticated Settings, encrypted server-side, and stored separately from ordinary profile data. Saved secrets are masked in the normal interface and are not returned in plaintext after storage. Members can replace, test, or remove credentials.

## Date of Birth and Age Eligibility
Date of birth is collected to enforce the platform's 18+ account requirement. It is not shown in Market Commons, public profile surfaces, analytics URLs, or ordinary member listings. Access is restricted to server-side/account-administration functions with a legitimate operational need.

## Cookies and Local Storage
We use browser storage and similar technologies for authentication, session continuity, security, interface preferences, notification state, saved layouts, and advertising-frequency controls. Optional analytics or advertising preferences are governed by the member preference/consent controls where available.

## Service Providers
Infrastructure and operational providers may include Cloudflare, Supabase, payment providers, email services, and member-selected market-data providers. Those providers process information under their own terms and privacy obligations.

## Retention
We retain information for as long as needed to provide the service, protect security, resolve disputes, maintain lawful transaction records, and satisfy legal requirements. Account deletion removes or deactivates ordinary account access while certain payment, fraud-prevention, tax, audit, or legal records may be retained where required.

## Member Controls
Dashboard Settings provides controls for connected credentials, notification preferences, privacy choices, data export where supported, active sessions/security features, and account deletion. Support can be used for questions or requests that cannot be completed through self-service controls.

## Security
We use access controls, encrypted transport, server-side secret storage, role-based administration, audit logging, and other safeguards appropriate to the service. No system can guarantee absolute security; members should use unique passwords and protect connected-provider credentials.

## Children
The service is not available to persons under 18. We do not knowingly permit under-18 account creation. If we learn that an ineligible account was created, we may close it and take appropriate data-handling steps.

## Contact and Changes
Material privacy changes will be reflected in the current published version and effective date. Privacy questions may be submitted through the Support Center or the published business contact channel.$$,
version='1.1',updated_at=now() where document_code='PRIVACY';

update public.legal_documents set body_markdown=$$## Recurring Memberships
Monthly and Annual Memberships are recurring products unless checkout states otherwise. The checkout screen must identify the price, billing period, renewal timing, and applicable taxes before purchase. By completing checkout for a recurring product, you authorize the payment provider to charge the applicable recurring amount until cancellation.

## Pick What You Want
Individual Tool Passes may be billed separately. Adding or removing one tool does not automatically alter unrelated Tool Passes unless the checkout explicitly states otherwise.

## Lifetime Membership
Lifetime Membership is a one-time first-party access product. It does not guarantee perpetual inclusion of third-party services that later require separate licensing, exchange fees, provider fees, or other unavoidable per-user charges.

## Trials
A trial must state its duration and whether payment information is required. A trial does not automatically become paid unless the checkout/offer expressly says that it will and the member has authorized billing.

## Renewal and Cancellation
Members can review renewal/expiration state in the Dashboard. Cancellation stops future renewal according to provider processing rules and applicable law; access may continue through the already-paid period. A cancellation does not by itself create a refund right.

## Failed Payments
If a recurring payment fails, access may enter a past-due or grace state while the payment provider retries or the member updates payment information. The platform will not intentionally represent past-due access as fully current.

## Plan Changes
Before a plan change is confirmed, the interface should disclose the new plan, feature impact, effective date, and any provider-calculated proration, credit, or charge. Payment-provider records remain authoritative for actual billing.

## Taxes
Taxes and legally required charges are calculated during checkout by the configured payment provider where supported.

## Support
Billing questions, duplicate charges, account-access problems after payment, or cancellation issues should be submitted through the Support Center with the relevant order or subscription information.$$,
version='1.1',updated_at=now() where document_code='SUBSCRIPTION';

update public.legal_documents set body_markdown=$$## Cancellations
Recurring memberships may be cancelled through the available billing controls or Support Center. Cancellation prevents future renewal according to the payment provider and applicable law. Access generally continues through the paid period unless the provider or applicable law requires otherwise.

## Refund Requests
Unless required by law or expressly promised at checkout, fees for digital membership/tool access already delivered are generally non-refundable. We will review duplicate charges, billing errors, materially failed access after payment, and other circumstances where applicable law or the checkout terms provide a refund right.

## Books and Third-Party Retailers
Purchases completed through Amazon or another third-party retailer are governed by that retailer's refund and return rules. The website cannot issue a refund for a transaction it did not process.

## How to Request Review
Use the Support Center and select Billing, Payment, Refund, or Store/Purchase. Include the order number, date, amount, and a concise explanation. Do not send full payment-card numbers.

## Processing
Approved refunds are sent through the original payment provider. Timing after approval depends on the provider and financial institution.

## Chargebacks
Contacting support first is the fastest way to investigate an error. Fraudulent or abusive chargebacks may result in account restriction, but nothing here limits lawful dispute rights.$$,
version='1.1',updated_at=now() where document_code='REFUNDS';

-- ============================================================
-- 8. HELP ARTICLES FOR ACCOUNT/CONNECTION/SUPPORT OPERATIONS
-- ============================================================
insert into public.help_articles(article_code,category,title,summary,body_markdown,audience,status,sort_order) values
('ACCOUNT_DELETE','Account & Security','Delete Your Account','How account deletion works and what may be retained.','Open Dashboard → Settings → Danger Zone → Delete Account. Review the consequences, type DELETE ACCOUNT exactly, and confirm. Active access ends when deletion completes. Some payment, tax, fraud-prevention, security, dispute, or audit records may be retained where legally or operationally required.','member','published',55),
('SUPPORT_CENTER','Support','Use the Support Center','Create, track, and reply to support requests.','Open Dashboard → Support. Choose the category that best matches the problem, provide a clear subject and description, and submit the ticket. You can return to the same tab to see status and staff replies. Never include passwords, complete API tokens, or payment-card numbers in a support ticket.','member','published',56),
('TOKEN_SECURITY','Connections & API Keys','How Saved API Keys Are Protected','Understand show/hide, save, masking, testing, replacement, and removal.','While entering a new API key, use Show/Hide to confirm what you typed. When you save it, the browser sends it over HTTPS to the authenticated server API. The server validates where supported, encrypts the secret, stores only encrypted data in the credential vault, and returns a masked hint such as the last four characters. The full saved secret is not returned to the browser. Use Replace to enter a new credential or Remove to delete the stored connection.','member','published',57),
('AGE_REQUIREMENT','Getting Started','18+ Account Requirement','Why date of birth is requested during account creation.','Accounts and purchases are limited to users age 18 or older. The registration service checks date of birth on the server before creating the account. Date of birth is restricted account information and is not displayed as part of your Market Commons identity.','public','published',58)
on conflict(article_code) do update set category=excluded.category,title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,audience=excluded.audience,status='published',sort_order=excluded.sort_order,updated_at=now();

-- ============================================================
-- 9. SITE SETTINGS / VERSION
-- ============================================================
insert into public.site_settings(setting_key,category,value,public_read,description) values
('site.version','site','"0.13.2"'::jsonb,true,'Current public website version.'),
('accounts.minimum_age','accounts','18'::jsonb,true,'Minimum age for account creation and purchasing.'),
('accounts.require_dob','accounts','true'::jsonb,true,'Require date of birth during account creation.'),
('support.enabled','support','true'::jsonb,true,'Enable member support tickets.'),
('ui.dashboard_compact_overview','ui','true'::jsonb,true,'Use compact member Dashboard overview.'),
('ui.member_profile_mode','ui','"community_only"'::jsonb,true,'Do not duplicate Dashboard account controls in a separate profile page.')
on conflict(setting_key) do update set value=excluded.value,description=excluded.description,updated_at=now();

-- service role sequence grants
DO $$ DECLARE s text; BEGIN
  FOREACH s IN ARRAY ARRAY['account_deletion_events_id_seq','support_tickets_id_seq','support_ticket_messages_id_seq','site_announcements_id_seq'] LOOP
    IF to_regclass('public.'||s) IS NOT NULL THEN EXECUTE format('grant usage,select on sequence public.%I to service_role',s); END IF;
  END LOOP;
END $$;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

commit;
notify pgrst,'reload schema';

-- ------------------------------------------------------------
-- 12. COMPLETE CUSTOMER-FACING POLICY BASELINES (v1.1)
-- These are substantive business drafts, not placeholders. Final jurisdiction-specific
-- launch language remains subject to licensed legal review.
-- ------------------------------------------------------------
update public.legal_documents set body_markdown=$POL$
Educational & Trading Disclaimer

The Stock Market: From the Ground Up, its books, website, historical Labs, simulator/replay tools, Market Tutor, Journal, analytics, Market Commons, research tools, charts, market-data displays, examples, exercises, and commentary are educational and self-directed practice resources only. They do not constitute personalized investment advice, brokerage services, fiduciary advice, tax advice, legal advice, trade signals, or a recommendation or solicitation to buy, sell, short, hold, exercise, or otherwise transact in any security, option, strategy, or financial product.

Trading and investing involve risk. Losses can be substantial, and some products or strategies may expose a trader to losses greater than the amount initially committed. Historical examples, simulated trades, backtests, replay results, hypothetical performance, paper trading, MFE/MAE analysis, and educational scenarios are not guarantees or predictions of future results. Market conditions, liquidity, spreads, volatility, halts, corporate actions, news, fees, taxes, data quality, execution quality, and other variables can materially affect outcomes.

Market Tutor responses and platform analytics are educational software outputs. Users remain responsible for independently verifying information, determining suitability, setting risk, and making all real-money decisions. Data may be delayed, incomplete, exchange-limited, provider-limited, corrected, or unavailable. Do not rely on the platform as the sole source for time-sensitive trading decisions.

Nothing on the platform creates an adviser-client, broker-client, fiduciary, attorney-client, tax-adviser, or similar professional relationship. Consult appropriately licensed professionals when your circumstances require individualized professional advice.
$POL$,version='1.1',updated_at=now() where document_code='DISCLAIMER';

update public.legal_documents set body_markdown=$POL$
Community Guidelines — The Ground-Up Market Commons

The Ground-Up Market Commons is an educational discussion environment for market reasoning, research, historical review, simulation, risk, execution, books, Labs, and platform support. Members should distinguish observable evidence from inference and should provide useful context when discussing a ticker, setup, catalyst, chart, trade review, or market event.

Prohibited conduct includes pump-and-dump or coordinated manipulation activity; guaranteed-return claims; impersonation; scams; phishing; credential theft; sharing API keys or passwords; doxxing or private personal information; harassment or threats; discriminatory abuse; unlawful content; malware; spam; undisclosed paid promotion; repeated off-topic disruption; fabricated performance claims; and presenting rumors as verified fact. Members may discuss securities and their own ideas, but the Commons must not be used to organize manipulative trading activity or to pressure other members into trades.

Use the most relevant sub-forum. Respect topic locks, pinned guidance, moderator instructions, and support boundaries. Content can be moved, labeled, locked, hidden, archived, or removed when necessary for organization, safety, legal requirements, platform integrity, or rule enforcement. Account privileges may be restricted or suspended for serious or repeated violations. Moderation decisions may be logged and reviewed by authorized staff.

Members are responsible for the content they post and should not post material they do not have the right to share. The platform does not verify every community statement. Treat community posts as user-generated discussion, not professional advice or verified market data.
$POL$,version='1.1',updated_at=now() where document_code='COMMUNITY';

update public.legal_documents set body_markdown=$POL$
Advertising & Sponsorship Disclosure

The platform may display clearly labeled paid advertising, sponsored placements, or sponsorships. Advertising inventory is managed separately from educational scoring, Market Tutor responses, trading decisions, simulator controls, risk warnings, and first-party editorial conclusions. Payment for advertising does not entitle a sponsor to alter educational results or receive preferential treatment in member trade analysis.

Advertisements and sponsored content must be identifiable as advertising or sponsorship. Placement frequency can vary by membership tier and site area. Lifetime Membership and OWNER access may be configured as ad-free. The platform may refuse, pause, remove, or limit campaigns that are deceptive, unsafe, unlawful, misleading, technically harmful, inappropriate for the audience, inconsistent with platform standards, or create unacceptable conflicts with trading education.

Clicking an advertisement can take the member to a third-party website. Third-party products, claims, privacy practices, terms, availability, and transactions are controlled by the third party unless expressly stated otherwise. Inclusion of an advertisement is not an endorsement, investment recommendation, or warranty of the advertiser or product.

Advertisers do not receive private member conversations from ChatGPT-style Tutor interactions, passwords, saved API credentials, or raw payment-card information from this platform merely because they advertise here. Advertising analytics may record information such as placement, impression, click, time, membership-level eligibility, and campaign identifiers as described in the Privacy Policy.
$POL$,version='1.1',updated_at=now() where document_code='ADVERTISING';

update public.legal_documents set body_markdown=$POL$
Cookie & Local Storage Notice

The website uses browser storage and similar technologies needed to operate authentication, security, preferences, responsive navigation, session timeout, remembered username/email preference, feature state, accessibility preferences, advertising frequency controls, and other application functions. Some storage is essential to keep a member signed in and to protect authenticated features.

The website does not intentionally store account passwords or saved plaintext market-data API tokens in browser local storage. Saved provider credentials are handled through authenticated server endpoints and encrypted server-side. Browser storage can contain non-secret identifiers, session material managed by the authentication provider, preference values, and short-lived application state.

Members can clear site data using browser controls. Clearing storage may sign the member out, reset preferences, remove remembered login identifiers, or clear locally cached state. Where optional analytics, advertising, or future marketing technologies require consent under applicable law, the platform should expose those choices through the member Privacy/Consent settings before enabling the optional category.

This notice should be read together with the Privacy Policy, which explains categories of information processed, purposes, providers, retention, and account rights.
$POL$,version='1.1',updated_at=now() where document_code='COOKIES';

update public.legal_documents set body_markdown=$POL$
Accessibility Statement

We intend The Stock Market: From the Ground Up platform to be usable by people with disabilities and target WCAG 2.2 AA principles for the production application. The design system is intended to support semantic structure, keyboard operation, visible focus indicators, sufficient contrast, responsive reflow, screen-reader naming, reduced-motion preferences, touch-target sizing, form labels, understandable errors, and zoom without loss of essential functionality.

Accessibility is treated as an ongoing engineering requirement rather than a one-time certification claim. Complex trading interfaces, charts, simulator workspaces, tables, replay controls, and third-party embeds can require additional testing and alternative presentation. Where a visual chart conveys important instructional information, supporting text, labels, data tables, descriptions, or equivalent learning context should be used where practical.

If you encounter an accessibility barrier, submit a Support ticket and identify the page, feature, assistive technology/browser if relevant, and the problem encountered. Accessibility reports should be prioritized for investigation and tracked through the support/QA process.

This statement does not claim independent third-party certification unless and until such certification is actually completed.
$POL$,version='1.1',updated_at=now() where document_code='ACCESSIBILITY';

update public.legal_documents set body_markdown=$POL$
Copyright & Intellectual Property Notice

First-party website software, branding, original instructional text, exercises, assessments, diagrams, original datasets/annotations created for the platform, historical-Lab organization, user-interface assets, and J. S. Grant book content are protected by applicable copyright, trademark, contract, and other intellectual-property law. Publication under the Crown & Lantern Press imprint does not transfer ownership to platform users.

Members receive only the access rights expressly associated with their book, membership, Tool Pass, or other entitlement. Unless expressly authorized, members may not reproduce, redistribute, scrape, republish, sell, publicly post, remove rights notices from, or create unauthorized competing copies of protected first-party material. Normal personal notes, screenshots used solely for legitimate support, and member-created journal records remain subject to the applicable Terms and fair-use/legal rights.

Third-party trademarks, broker/platform names, market data, APIs, exchange identifiers, issuer materials, regulatory filings, and other third-party content remain the property of their respective owners and are used only to the extent permitted by applicable law, license, source terms, or educational reference principles.

Members retain ownership of their original community posts and submitted content subject to the platform Terms and the limited rights reasonably needed to host, display, moderate, secure, back up, and operate that content. Suspected infringement can be reported through Support with enough information to identify the material and the claimed right.
$POL$,version='1.1',updated_at=now() where document_code='COPYRIGHT';

notify pgrst,'reload schema';
