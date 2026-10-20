-- v0.14.0.96 | 419 ORIGINAL CONCEPTUAL EXERCISE DRAFTS | OWNER REVIEW REQUIRED
-- Existing ONE Supabase project. ZERO-cost: hypothetical prices are
-- original arithmetic examples, NOT actual or reconstructed historical bars.
-- Reuses platform_labs (419 registry), lab_instruction_v014 (Foundations only),
-- lab_training_sets_v014 (private keys), existing v014_training_* graded RPCs.
-- NO new tables, Lab IDs, subscriptions or historical datasets.
-- ALL keys remain in private service-role-only database after installation.
-- Candidate sets remain DRAFT; no claims of editorial acceptance or mastery.
BEGIN;
DO $requirements$
DECLARE present_labs integer; distinct_collections integer;
BEGIN
 IF to_regclass('public.platform_labs') IS NULL OR
    to_regclass('public.lab_training_sets_v014') IS NULL OR
    to_regclass('public.lab_instruction_v014') IS NULL THEN
  RAISE EXCEPTION 'Existing Lab/training schema missing; install reviewed dependencies, not a duplicate system';
 END IF;
 SELECT count(*),count(DISTINCT book_code) INTO present_labs,distinct_collections
 FROM public.platform_labs;
 IF present_labs<>419 OR distinct_collections<>6 THEN
  RAISE EXCEPTION 'Stop: canonical Lab registry must contain exactly 419 records across six collections; found % and %',present_labs,distinct_collections;
 END IF;
 IF EXISTS (SELECT 1 FROM public.platform_labs
   WHERE book_code NOT IN ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3',
        'DAY_TRADING_BOOK_1','READING_THE_TAPE','SITE_EXCLUSIVE')
     OR coalesce(btrim(title),'')='') THEN
  RAISE EXCEPTION 'Unexpected Lab collection or missing lesson title';
 END IF;
END $requirements$;
-- Preserve all existing Foundations instruction; create supplemental
-- conceptual orientation ONLY where it is missing. This never changes v1.14
-- book manuscripts, private historic answers or registered ticker/date.
INSERT INTO public.lab_instruction_v014(lab_id,book_number,content,source_status)
SELECT l.lab_id,split_part(l.book_code,'_',3)::integer,
 jsonb_build_object(
  'id',l.lab_id,'concept',l.title,'book',
    split_part(l.book_code,'_',3)::integer,
  'learningSource','Original conceptual companion, not a reproduction of book manuscript',
  'historicalEvidence','Not verified: the registry ticker/date is a teaching anchor only',
  'objective','Explain '||l.title||' using observations available at a declared pause point.',
  'why','A historical price chart cannot prove participant motives, future candles or actual order execution. A defensible decision distinguishes observed facts, hypotheses and invalidation.',
  'steps',jsonb_build_array(
   'Write a one-sentence definition of "'||l.title||'" using the approved Foundations lesson.',
   'Identify exactly which data fields would be observable at the paused decision time.',
   'Separate the measurable observation from at least one possible inference.',
   'Write one invalidation or no-trade condition before examining any later data.',
   'Practice the original hypothetical calculations separately from any claimed historical evidence.'
  ),'grader','Private v014_training_* RPC. Graded conceptual exercise only; no real price or trade verification.'
 ),'original_hypothetical_unreviewed_v01496'
FROM public.platform_labs l
WHERE l.book_code IN ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3')
ON CONFLICT(lab_id) DO NOTHING;
-- Each of the 419 existing Lab IDs receives one unique version-96
-- *draft* assessment, never altering older reviewed versions.
-- Correct numeric answers are derived transactionally from the ORIGINAL
-- hypothetical arithmetic inputs, then stored ONLY in the private answer_key.
WITH original AS (
 SELECT l.lab_id,l.title,l.book_code,l.metadata,
   abs(hashtext(l.lab_id)::bigint) AS seed,
   CASE WHEN l.title ~* '(spread|liquid|bid|ask|quote|level.?2|depth)'
         OR l.metadata->>'skill_group' ~* '(spread|liquid)' THEN 'SPREAD'
        WHEN l.title ~* '(risk|stop|position siz|buying power|loss limit|exposure)'
         OR l.metadata->>'skill_group' ~* '(risk)' THEN 'RISK'
        WHEN l.title ~* '(volume|float|turnover|participation)' THEN 'VOLUME'
        WHEN l.title ~* '(tape|print|order flow|time & sales|auction)' OR l.book_code='READING_THE_TAPE' THEN 'PRINTS'
        WHEN l.title ~* '(candle|wick|bar structure|ohlc|body)' THEN 'CANDLE'
        WHEN l.title ~* '(timeframe|time frame|clock|session|premarket|midday|opening)'
          THEN 'TIME'
        WHEN l.title ~* '(vwap|ema|moving average|indicator)' THEN 'VWAP'
        WHEN l.title ~* '(review|statistics|strategy valid|win rate|analytics)' THEN 'REVIEW'
        ELSE 'RANGE' END AS family
 FROM public.platform_labs l
), numbers AS (
 SELECT original.*,
  (2100 + seed % 1100)::integer AS quoted_bid_cents,
  (2 + seed % 9)::integer AS spread_cents,
  (100 + 25*(seed % 8))::integer AS risk_budget,
  (25*(1 + seed % 4))::integer AS risk_cents,
  (2 + seed % 4)::integer AS relative_multiple,
  (50 + 10*(seed % 10))::integer AS print_a,
  (20 + 10*(seed % 8))::integer AS print_b,
  (10 + 10*(seed % 6))::integer AS print_c,
  (6 + seed % 26)::integer AS candle_body_cents,
  (30 + 5*(seed % 10))::integer AS span_minutes,
  (18 + seed % 14)::integer AS vwap_low,
  (5 + seed % 11)::integer AS winning_observations,
  (50 + seed % 70)::integer AS range_cents
 FROM original
), exercise AS (
 SELECT n.*,
 CASE family
  WHEN 'SPREAD' THEN format(
    'ORIGINAL hypothetical quote snapshot: bid $%s, ask $%s. What is the quoted spread in CENTS? Do not infer an executable fill.',
    to_char(quoted_bid_cents::numeric/100,'FM9990.00'),
    to_char((quoted_bid_cents+spread_cents)::numeric/100,'FM9990.00'))
  WHEN 'RISK' THEN format(
    'ORIGINAL hypothetical risk exercise: maximum planned loss $%s; stop distance $%s per share. Excluding all fees, gaps and slippage, what is the MAXIMUM WHOLE-SHARE quantity?',
    risk_budget,to_char(risk_cents::numeric/100,'FM9990.00'))
  WHEN 'VOLUME' THEN format(
    'ORIGINAL hypothetical volume example: current observed volume %s shares; comparable average %s shares. What is the relative-volume MULTIPLE?',
    60000*relative_multiple,60000)
  WHEN 'PRINTS' THEN format(
    'ORIGINAL hypothetical printed transactions: %s, %s and %s shares, respectively. What is the total number of shares in THESE THREE prints? Neither trader identity nor intention can be inferred.',
    print_a,print_b,print_c)
  WHEN 'CANDLE' THEN format(
    'ORIGINAL hypothetical finished candle: open $10.00 and close $%s. What is the absolute real-body size in CENTS? This says nothing about the next candle.',
    to_char((1000+candle_body_cents)::numeric/100,'FM9990.00'))
  WHEN 'TIME' THEN format(
    'ORIGINAL hypothetical chart clock: %s minutes of an already observed sequence containing contiguous five-minute bars. How many COMPLETE five-minute bars does this represent?',
    span_minutes)
  WHEN 'VWAP' THEN format(
    'ORIGINAL hypothetical two-print VWAP illustration: equal 100-share trades at $%s and $%s. What is their volume-weighted average execution price in DOLLARS? This is NOT the full-session VWAP.',
    vwap_low,vwap_low+4)
  WHEN 'REVIEW' THEN format(
    'ORIGINAL hypothetical, pre-classified review sample: %s favorable results among exactly 20 observations. What is the favorable-rate PERCENTAGE? This sample proves neither future edge nor execution quality.',
    winning_observations)
  ELSE format(
    'ORIGINAL hypothetical observed price interval: high $12.00; low $%s. What is its RANGE in CENTS? No future candles or confirmed trades are implied.',
    to_char((1200-range_cents)::numeric/100,'FM9990.00'))
 END AS numeric_prompt,
 CASE family
  WHEN 'SPREAD' THEN spread_cents::numeric
  WHEN 'RISK' THEN trunc(risk_budget::numeric/(risk_cents::numeric/100))
  WHEN 'VOLUME' THEN relative_multiple::numeric
  WHEN 'PRINTS' THEN (print_a+print_b+print_c)::numeric
  WHEN 'CANDLE' THEN candle_body_cents::numeric
  WHEN 'TIME' THEN (span_minutes/5)::numeric
  WHEN 'VWAP' THEN (vwap_low+2)::numeric
  WHEN 'REVIEW' THEN (winning_observations*5)::numeric
  ELSE range_cents::numeric END AS numeric_key,
 CASE family
  WHEN 'SPREAD' THEN 'Subtract bid from ask; convert dollars to cents. Quotes do not establish available depth or queue position.'
  WHEN 'RISK' THEN 'Divide the stated loss budget by absolute per-share stop distance and round DOWN. Realized loss can exceed planned risk due to gaps, fees and slippage.'
  WHEN 'VOLUME' THEN 'Divide observed volume by a comparable average; check matching times and sessions before interpreting the ratio.'
  WHEN 'PRINTS' THEN 'Add the three observed sizes only. Prints do not disclose the identity, intention or unshown quotes of participants.'
  WHEN 'CANDLE' THEN 'The absolute candle body is abs(close minus open); convert dollars to cents. High/low wicks are not its body.'
  WHEN 'TIME' THEN 'Divide elapsed minutes by the five-minute interval; include only fully observed bars.'
  WHEN 'VWAP' THEN 'With equal quantities, the weighted price equals the arithmetic mean for THESE TWO prints, not an exchange-validated session indicator.'
  WHEN 'REVIEW' THEN 'Divide the number of favorable observations by 20 and multiply by 100. Do not generalize a small illustrative sample into expected returns.'
  ELSE 'The observed high minus observed low is the range. A range reveals neither the intrabar order nor the subsequent movement.'
 END AS numeric_explanation
 FROM numbers n
), packages AS (
 SELECT lab_id,title,
 jsonb_build_array(
  jsonb_build_object(
   'id','EVIDENCE','kind','choice',
   'prompt','In "'||left(title,170)||'", which learning method correctly distinguishes evidence from inference at the decision boundary?',
   'options',jsonb_build_array(
    'Record only displayed fields and timestamps; label uncertainty before deciding.',
    'Assume a later candle confirms what was observable earlier.',
    'Infer unseen participant identity and intent from a completed candle.'),
   'explanation','For '||left(title,150)||', evidence is limited to what a qualified observer could have seen at that moment. A candle alone cannot establish hidden order intent or a later outcome.'),
  jsonb_build_object(
   'id','FOCUS','kind','choice',
   'prompt','Which study objective is appropriate BEFORE acting on "'||left(title,160)||'"?',
   'options',jsonb_build_array(
    'Write the observable premise, the main uncertainty, and a condition that invalidates the interpretation.',
    'Label the setup a guaranteed winner once a familiar pattern appears.',
    'Treat a single observation as proof of execution price and profitability.'),
   'explanation',left(coalesce(nullif(metadata->>'why',''),nullif(metadata->>'objective',''),
    'A documented process must be tested against information known at the pause point, not hindsight.'),700)),
  jsonb_build_object(
   'id','ORIGINAL_MATH','kind','number',
   'prompt',numeric_prompt,'tolerance',0,
   'explanation',numeric_explanation||' Worked result: '||numeric_key||'. These values were INVENTED for instruction and are not market-history evidence.'),
  jsonb_build_object(
   'id','BOUNDARY','kind','choice',
   'prompt','For this "'||left(title,160)||'" exercise, which final action protects the decision process from lookahead bias?',
   'options',jsonb_build_array(
    'Lock the observation, reasoning and invalidation before revealing any later evidence; review the later outcome separately.',
    'Review the future outcome first, then rewrite the decision to make it look prescient.',
    'Award a verified trading-performance grade from a hypothetical calculation alone.'),
   'explanation','The decision and later review are separate time-ordered records. A hypothetical example can grade arithmetic or reasoning, never a genuine historical trade or future price.')
 ) AS questions,
 jsonb_build_object(
  'EVIDENCE','Record only displayed fields and timestamps; label uncertainty before deciding.',
  'FOCUS','Write the observable premise, the main uncertainty, and a condition that invalidates the interpretation.',
  'ORIGINAL_MATH',numeric_key,
  'BOUNDARY','Lock the observation, reasoning and invalidation before revealing any later evidence; review the later outcome separately.'
 ) AS answer_key
 FROM exercise
)
INSERT INTO public.lab_training_sets_v014(
 lab_id,version,review_state,source_status,title,questions,answer_key
)
SELECT p.lab_id,96,'draft','original_hypothetical_unreviewed_v01496',
 left(p.title,200),p.questions,p.answer_key FROM packages p
ON CONFLICT(lab_id,version) DO NOTHING;
-- Explicitly retain all existing v1..v95 reviewed and in-progress attempts.
-- No auto-review, auto-award or simulated historical datasets.
NOTIFY pgrst,'reload schema';
COMMIT;
