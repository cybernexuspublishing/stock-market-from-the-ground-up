-- v0.14.0.304 | exactly 20 original B01 transfer cases | educational DRAFT.
-- NO grader updates, labels, masteries or historical data alterations.
-- The unique 304 migration follows the independently installed v303 review queue.
BEGIN;
CREATE TEMP TABLE b01_transfer_draft_v304(lab_id text PRIMARY KEY,prompt text NOT NULL) ON COMMIT DROP;
INSERT INTO b01_transfer_draft_v304(lab_id,prompt) VALUES
('F1-C02-L01','FICTIONAL TRANSFER: You receive an unfamiliar symbol and an undated five-minute chart from a study partner. Build a fresh replay setup record with a dated source, time zone, session and observation cutoff. Explain why you would pause rather than judge the next candle.'),
('F1-C02-L02','FICTIONAL TRANSFER: Another learner claims two replay runs agree, but the second run uses a later pause and a different adjustment setting. Independently specify the settings you must match, the evidence known at each pause, and how you would detect accidental look-ahead.'),
('F1-C04-L01','FICTIONAL TRANSFER: An investor buys 40 shares from another investor on an exchange while the issuer separately announces a new offering. Explain which transaction changes who owns existing shares and which may change shares outstanding; identify the filing needed before making a dilution claim.'),
('F1-C06-L01','FICTIONAL TRANSFER: A one-minute bar has a large upward wick and elevated volume. A forum post attributes it to a named institution. Separate directly visible chart facts from unverified participant identities, and state the evidence you would need before repeating that attribution.'),
('F1-C07-L01','FICTIONAL TRANSFER: A company issues ordinary voting shares but its promotional graphic describes them as guaranteed income. Explain the ownership rights generally associated with common shares, name what must be checked in issuer documents, and identify why no dividend or price outcome can be promised.'),
('F1-C07-L02','FICTIONAL TRANSFER: An article quotes a broad equity index at 4,000 points while a separate exchange-traded fund displays a $40 share price. Explain which is a benchmark measurement, which is a tradable security, and what tracking and trading details you would verify before comparing performance.'),
('F1-C08-L01','FICTIONAL TRANSFER: Company A has a $320 share price and 5 million outstanding shares; Company B has a $32 share price and 180 million outstanding shares. Calculate each illustrative equity market capitalization and explain why the higher share price alone does not identify the larger company.'),
('F1-C08-L02','FICTIONAL TRANSFER: A smaller issuer shows 48 million shares outstanding at $6.25, then announces a hypothetical share issuance. Calculate the initial market capitalization, identify which share count must be updated, and explain why a size label can change without proving business quality.'),
('F1-C08-L03','FICTIONAL TRANSFER: A thinly traded $1.80 candidate shows a $1.65 bid for 200 shares and a $1.95 ask for 100 shares. Calculate the quoted spread, describe what the displayed sizes do and do not guarantee, and explain an evidence-based NO TRADE decision despite a large percentage mover.'),
('F1-C09-L01','FICTIONAL TRANSFER: Two classmates observe the same volatile equity, but one training account has a small loss limit while the other allows a larger position. Compare how account constraints can change allowable choices without changing the observed market facts, and include a valid NO TRADE outcome.'),
('F1-C10-L01','FICTIONAL TRANSFER: A learner considers buying 25 shares at an illustrative $18 with a planned invalidation level of $16.80. Describe long exposure, compute the hypothetical risk per share and total price-distance risk before fees or slippage, and state why neither a stop instruction nor profit is guaranteed.'),
('F1-C10-L02','FICTIONAL TRANSFER: A news story says a security declined after a hypothetical short entry. Explain how selling borrowed shares first creates short exposure, why repurchase may be needed to close, and identify borrowing, squeeze and theoretically unbounded loss considerations without initiating a short trade.'),
('F1-C12-L01','FICTIONAL TRANSFER: For a company with a dated announcement and a volatile chart, write three separate notes: what an investor is still researching, what a short-term plan would require before any action, and what a retrospective reviewer may conclude only after later evidence exists.'),
('F1-C13-L01','FICTIONAL TRANSFER: Three learners each observe the same midday setup but plan different holding horizons: seconds, within the session, and across several days. Match risk checks and market-session assumptions to each intended horizon, and explain why the eventual profit does not retrospectively define the plan.'),
('F1-C13-L02','FICTIONAL TRANSFER: A trading diary describes a swing style, a momentum approach, a failed-breakout setup and an illiquid extended-hours context. Classify each term at the correct level and explain why mixing those labels obscures the reason for a NO TRADE decision.'),
('F2-C01-L01','FICTIONAL TRANSFER: On an invented U.S. equity trading date, a screenshot uses 08:50, 09:31, 15:59 and 16:20 Eastern Time without session labels. Assign each observation to the appropriate session window, identify what a timestamp does not establish about venue or execution, and never treat the next window as visible beforehand.'),
('F2-C02-L01','FICTIONAL TRANSFER: Compare the first ten minutes of an invented regular session with a separately observed midday interval from the same stock. Record the matching source, price intervals, spread and volume context; explain why one early burst cannot prove the midday decision or the next outcome.'),
('F2-C02-L02','FICTIONAL TRANSFER: A study packet shows completed candles from a lunchtime lull and from a later afternoon interval, but the later interval has an unknown reporting delay. Explain how to establish comparable data provenance and intervals, which claims are unsafe, and how a NO TRADE decision changes without the missing observations.'),
('F2-C02-L03','FICTIONAL TRANSFER: At a hypothetical 15:55 Eastern Time pause, you see completed bars and an indicative close-related headline, but no final closing-auction result. Explain what is observable, identify auction and order-lifecycle uncertainties, and make a defensible decision without using the unrevealed final close.'),
('F2-C03-L01','FICTIONAL TRANSFER: A hypothetical equity has a 15:59 regular-session quote, a reported 16:00 close, and a later 16:18 extended-hours quote. Keep these observations distinct by timestamp, session and execution conditions; explain why a changed spread cannot be presented as a guaranteed accessible fill.');
DO $guard$
BEGIN
 IF (SELECT count(*) FROM b01_transfer_draft_v304)<>20
 THEN RAISE EXCEPTION 'Exactly 20 individualized transfer cases required'; END IF;
 IF (SELECT count(*) FROM public.lab_instruction_v014 i
  JOIN b01_transfer_draft_v304 p USING(lab_id)
  WHERE i.content->>'lessonBatch'='2026-10-25-B01'
   AND i.source_status='original_hypothetical_unreviewed_v01496'
   AND i.reviewed_by IS NULL AND i.reviewed_at IS NULL
   AND NOT (i.content ? 'transfer') AND NOT (i.content ? 'transferDraftBatch'))<>20
 THEN RAISE EXCEPTION 'B01 transfer authoring preflight failed; do not overwrite published/edited lessons'; END IF;
END $guard$;
UPDATE public.lab_instruction_v014 i
SET content=jsonb_set(
 jsonb_set(
  jsonb_set(i.content,'{transfer}',to_jsonb(p.prompt),true),
  '{transferDraftBatch}',to_jsonb('B01_20261026_v304'::text),true),
 '{transferFingerprint}',to_jsonb(md5(p.prompt)),true)
FROM b01_transfer_draft_v304 p
WHERE i.lab_id=p.lab_id
 AND i.content->>'lessonBatch'='2026-10-25-B01'
 AND i.source_status='original_hypothetical_unreviewed_v01496'
 AND i.reviewed_by IS NULL AND i.reviewed_at IS NULL
 AND NOT (i.content ? 'transfer');
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.lab_instruction_v014 i
  JOIN b01_transfer_draft_v304 p USING(lab_id)
  WHERE i.content->>'transfer'=p.prompt
   AND i.content->>'transferDraftBatch'='B01_20261026_v304'
   AND i.content->>'transferFingerprint'=md5(p.prompt)
   AND i.reviewed_at IS NULL)<>20
 THEN RAISE EXCEPTION 'B01 transfer authoring postflight failed';END IF;
END $post$;
COMMIT;
