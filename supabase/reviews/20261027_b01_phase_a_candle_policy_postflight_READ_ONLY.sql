-- B01 draft-only candle clarification: key-free production postflight.
BEGIN READ ONLY;
WITH source AS(
 SELECT s.lab_id,s.version,s.review_state,s.reviewed_at,s.questions,s.answer_key,
 md5(s.questions::text) AS digest,
 b.applied_md5 AS editorial_checkpoint,
 c.revised_md5 AS candle_checkpoint
 FROM public.lab_training_sets_v014 s
 JOIN private.b01_question_backups_20261027 b USING(lab_id,version)
 JOIN private.b01_candle_pause_backup_20261027 c USING(lab_id,version)
 WHERE s.lab_id='F1-C02-L01' AND s.version=97
)
SELECT lab_id,version,
 (review_state='draft' AND reviewed_at IS NULL) AS still_draft,
 (questions->4->>'id'='B01_APPLICATION') AS expected_question_id,
 (questions->4->>'prompt' LIKE '%09:45:02 ET%' AND
   questions->4->>'prompt' ILIKE '%delivered%') AS finality_and_delivery_clear,
 (questions->4->>'explanation' ILIKE '%latency%') AS feed_latency_explained,
 (questions->4->>'criticalOnWrong'='true') AS critical_integrity_flag_preserved,
 (questions->4->'options' ? (answer_key->>'B01_APPLICATION')) AS key_still_listed,
 (position(upper(btrim(answer_key->>'B01_APPLICATION')) IN upper(questions->4->>'explanation'))=0) AS no_exact_key_echo,
 (digest=editorial_checkpoint AND digest=candle_checkpoint) AS both_private_rollback_checkpoints_valid,
 (SELECT count(*)=0 FROM public.lab_training_attempts_v014 a
  WHERE a.lab_id=source.lab_id AND a.set_version=source.version) AS no_real_attempts,
 NOT has_schema_privilege('anon','private','USAGE') AS anon_cannot_access_private_schema,
 NOT has_schema_privilege('authenticated','private','USAGE') AS authenticated_cannot_access_private_schema
FROM source;
ROLLBACK;
