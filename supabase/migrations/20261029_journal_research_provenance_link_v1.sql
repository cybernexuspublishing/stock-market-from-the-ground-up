-- Immutable source association between existing Journal and Workbench research.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_journal_research_links_v1(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 journal_id bigint NOT NULL REFERENCES public.decision_journal(id) ON DELETE CASCADE,
 workbench_record_id bigint NOT NULL REFERENCES public.tool_workspace_records(id) ON DELETE RESTRICT,
 source_observed_at timestamptz NOT NULL,
 source_published_at timestamptz,
 original_saved_at timestamptz NOT NULL,
 source_label text NOT NULL DEFAULT 'MEMBER_REPORTED_NOT_INDEPENDENTLY_VERIFIED',
 linked_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,journal_id,workbench_record_id),
 CHECK(source_published_at IS NULL OR source_published_at<=source_observed_at)
);
ALTER TABLE public.gu_journal_research_links_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_journal_research_links_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_journal_research_links_v1 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_journal_research_links_block_mutation_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path='pg_catalog','pg_temp'
AS $body$ BEGIN
 RAISE EXCEPTION 'Journal research provenance is append-only' USING ERRCODE='23000';
END $body$;
DROP TRIGGER IF EXISTS gu_journal_research_links_immutable_v1 ON public.gu_journal_research_links_v1;
CREATE TRIGGER gu_journal_research_links_immutable_v1 BEFORE UPDATE OR DELETE
 ON public.gu_journal_research_links_v1
 FOR EACH ROW EXECUTE FUNCTION public.gu_journal_research_links_block_mutation_v1();
REVOKE ALL ON FUNCTION public.gu_journal_research_links_block_mutation_v1() FROM PUBLIC,anon,authenticated;
COMMIT;