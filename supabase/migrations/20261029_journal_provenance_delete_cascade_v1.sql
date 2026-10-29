-- Preserve immutable linked research against edits, but allow member/account
-- erasure to cascade and avoid retaining orphaned private provenance.
BEGIN;
ALTER TABLE public.gu_journal_research_links_v1
 DROP CONSTRAINT IF EXISTS gu_journal_research_links_v1_workbench_record_id_fkey;
ALTER TABLE public.gu_journal_research_links_v1
 ADD CONSTRAINT gu_journal_research_links_v1_workbench_record_id_fkey
 FOREIGN KEY(workbench_record_id)
 REFERENCES public.tool_workspace_records(id) ON DELETE CASCADE;
DROP TRIGGER IF EXISTS gu_journal_research_links_immutable_v1 ON public.gu_journal_research_links_v1;
CREATE TRIGGER gu_journal_research_links_immutable_v1 BEFORE UPDATE
 ON public.gu_journal_research_links_v1 FOR EACH ROW
 EXECUTE FUNCTION public.gu_journal_research_links_block_mutation_v1();
-- Ordinary members have no direct UPDATE/DELETE/SELECT/INSERT access; only
-- server-authenticated creation/read is available. Source deletion and
-- account erasure now remove linked metadata as required.
COMMIT;