/* Controlling Owner-selected Free Membership V1 experience contract.
 * Source assertions only; provider integration and genuine member QA remain distinct.
 * $0 runtime and no private content, mock identities or payments required.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const page=read('dashboard.html');
const dashboard=read('assets/js/dashboard.js');
const academy=read('functions/_lib/free-foundations-v1.js');
const curriculum=read('functions/_lib/bootcamp-academy-v014168.js');
const simulator=read('simulator.html');
const auth=read('functions/api/member-tool-access.js');
const watchlist=read('free-watchlist.html');
const watchlistApi=read('functions/api/free-watchlist.js');
const academyApi=read('functions/api/bootcamp-academy.js');
const s=(condition,message)=>assert(condition,message);

// Priority 1 — recommended beginning, never a fake certification.
s(page.includes('free-start-level')&&page.includes('free-start-choose') &&
  dashboard.includes('setupFreeStartingPoint(sb,user.id)')&&dashboard.includes('renderFreeFoundationEvidence(sb,user.id)'),
  'Talia starting-point recommendation must connect to actual member progress');
s(page.includes('free-next-action')&&page.includes('free-next-detail'), 'real next lesson link required');
// Priority 2 — one-click ungraded fictional practice with transparent source.
s(page.includes('simulator.html?practice=free')&&simulator.includes('sim-load-fictional') &&
  simulator.includes('sim-candle-accessible')&&simulator.includes('sim-visible-bars'),
  'free chart must be accessible via a direct practice link and provide text alternatives');
s(simulator.includes('sim-talia-guidance')&&simulator.includes('NO TRADE'),
  'Talia must explain observation before speculative execution');
s(simulator.includes('client-inspectable')||simulator.includes('developer tools'),
  'fictional browser scenario must not masquerade as genuine blind replay');
// Priority 3 — substantive protected teaching; do not introduce an eighth Boot Camp.
s(curriculum.includes("free5")&&academy.includes("skillDomain:'Knowledge'")&&
  academy.includes("skillDomain:'Recognition'")&&academy.includes("skillDomain:'Decision'")&&
  academy.includes("skillDomain:'Process'"),'five Free lessons and four skills required');
for(const field of ['explanation:','workedExample:','sourceProcedure:','investigation:','selfCheck:','reviewGuide:','whenNot:','transfer:'])
 s(academy.includes(field),'zero-knowledge teaching component missing: '+field);
s(academyApi.includes("freeEligible")&&academyApi.includes("requestedCode==='free5'"),
  'Free Academy must reuse authoritative membership gate');
// Priority 4 — only independently assessed evidence may be classified as mastery.
for(const domain of ['knowledge','recognition','decision','process'])
 s(page.includes('free-skill-'+domain),'Missing learning evidence indicator '+domain);
s(page.includes('Not Yet Assessed')&&dashboard.includes('guided reflections · Not Yet Assessed'),
  'Ungraded reflection cannot become mastery');
// Priority 5 — manually entered watchlist with sourced uncertainty and private service.
s(page.includes('free-watchlist.html')&&watchlist.includes('free-watchlist-source-kind')&&
  watchlist.includes('free-watchlist-research-note')&&watchlistApi.includes('freeEligible'),
  'Free manual watchlist must have source labels and authorization');
// Priority 6 — real weekly account-specific usage and recent private work.
s(dashboard.includes("sb.rpc('gu_v014121_my_free_week_usage')")&&
  dashboard.includes("sb.from('decision_journal')")&&page.includes('free-recent-journal-list'),
  'Journal usage and activity must be sourced from private account evidence');
// Priority 7 — actual moderated community location and verification rules.
s(page.includes('market-commons.html?forum=START_HERE')&&
  page.includes('community-guidelines.html')&&page.includes('Before posting in Market Commons'),
  'Community orientation must be reachable from Free home');
// Priority 8 — contextual upgrades without paywalling instruction.
s(page.includes('Explanations, examples and guided teaching never require Lumens.')&&
  page.includes('Compare actual membership availability')&&
  page.includes('You can continue learning without upgrading.'),
  'Paid tool offers must not restrict basic explanations');
s(auth.includes('freeEligible')&&auth.includes('authorized'),
  'Free eligibility must be a separate decision from paid tool authorization');
// Design and WCAG targeted build contracts.
s(page.includes('aria-live="polite"')&&simulator.includes('role="img"')&&
  simulator.includes('sim-visible-bars')&&simulator.includes('sim-talia-guidance'),
  'Readable notifications, chart table and tutor integration required');
s(read('assets/css/free-member-launchpad.css').includes('max-width:620px'),
  'Free Dashboard must have mobile layout');
console.log('PASS: all eight Free Membership V1 source boundaries and accessibility entry points are present; actual user acceptance remains a separate gate.');
