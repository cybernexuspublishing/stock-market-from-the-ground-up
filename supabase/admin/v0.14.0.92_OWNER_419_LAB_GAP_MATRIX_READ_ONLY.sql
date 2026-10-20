-- v0.14.0.92 | 419-Lab completeness evidence matrix | OWNER SELECT ONLY
-- Run in the EXISTING Supabase project AFTER v0.14.0.91 object preflight.
-- If any table is missing, do NOT install or reseed it automatically.
-- Each output row is a named Lab; no user response, answer-key text or
-- private lesson body is returned. Datasets MUST be independently licensed.
BEGIN READ ONLY;

WITH rubric AS (
 SELECT lab_id, count(*) FILTER (
   WHERE review_state='reviewed' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL
    AND jsonb_array_length(questions)>0 AND answer_key <> '{}'::jsonb
 ) AS reviewed_rubrics,
 count(*) AS total_rubric_versions
 FROM public.lab_training_sets_v014 GROUP BY lab_id
),data AS (
 SELECT envelope.lab_id,
 count(*) FILTER (
   WHERE envelope.status IN ('verified','published')
    AND dataset.status IN ('verified','published')
    AND dataset.source_attribution IS NOT NULL AND btrim(dataset.source_attribution)<>''
    AND coalesce(dataset.metadata->>'original_synthetic','false')<>'true'
    AND coalesce(dataset.metadata->>'historical_evidence_verified','true')<>'false'
    AND dataset.license_note IS NOT NULL AND btrim(dataset.license_note)<>''
    AND envelope.decision_boundary_at IS NOT NULL
    AND envelope.context_start_at <= envelope.teaching_start_at
    AND envelope.teaching_start_at <= envelope.decision_boundary_at
    AND envelope.decision_boundary_at <= envelope.teaching_end_at
    AND envelope.teaching_end_at <= envelope.context_end_at
 ) AS documented_qualified_envelopes,
 count(*) AS envelope_count
 FROM public.historical_context_envelopes envelope
 LEFT JOIN public.market_datasets dataset ON dataset.dataset_code=envelope.dataset_code
 WHERE envelope.lab_id IS NOT NULL
 GROUP BY envelope.lab_id
)
SELECT l.lab_id,l.book_code,l.title,l.active,l.registry_visible,
 (i.lab_id IS NOT NULL AND jsonb_typeof(i.content)='object'
   AND i.content <> '{}'::jsonb) AS authored_private_instruction_present,
 COALESCE(r.reviewed_rubrics,0) AS reviewed_rubric_versions,
 COALESCE(r.total_rubric_versions,0) AS all_rubric_versions,
 COALESCE(d.documented_qualified_envelopes,0) AS qualified_data_envelopes,
 COALESCE(d.envelope_count,0) AS any_data_envelopes,
 (l.ticker IS NOT NULL AND l.historical_date IS NOT NULL) AS catalog_ticker_date_present,
 CASE WHEN NOT l.active OR NOT l.registry_visible THEN 'DISABLED'
      WHEN i.lab_id IS NULL THEN 'MISSING_PRIVATE_LESSON'
      WHEN COALESCE(r.reviewed_rubrics,0)=0 THEN 'MISSING_REVIEWED_GRADING'
      WHEN COALESCE(d.documented_qualified_envelopes,0)=0 THEN 'MISSING_LICENSED_HISTORICAL_CONTEXT'
      ELSE 'CONTENT_PRECHECK_ONLY__REPLAY_AND_PRIVACY_QA_REQUIRED'
 END AS evidence_stage
FROM public.platform_labs l
LEFT JOIN public.lab_instruction_v014 i ON i.lab_id=l.lab_id
LEFT JOIN rubric r ON r.lab_id=l.lab_id
LEFT JOIN data d ON d.lab_id=l.lab_id
ORDER BY l.book_code,l.lab_id;

-- Interpretation: Even "CONTENT_PRECHECK_ONLY" is NOT a fully finished Lab:
-- actual pedagogy, answers, no-lookahead APIs, executable market replay,
-- screen reader QA, entitlements and reproducible outcomes remain separate.
ROLLBACK;
