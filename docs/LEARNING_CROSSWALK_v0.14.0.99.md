# Existing 419 Lab → 30 competency instructional crosswalk
**Project:** The Stock Market: From the Ground Up. **Date:** 2026-10-19.
**Version:** v0.14.0.99. **File:** docs/LEARNING_CROSSWALK_v0.14.0.99.md.
**Status:** Original zero-cost instructional mapping; source-verified Lab IDs, not verified learning performance.
**Google Drive:** Not assigned.

## Source-check
**Corrected on October 19, 2026 (v0.14.0.101):** The original v0.13.4 migration already lists **30 actual competency definitions**, including `LEVEL2_READING`. A v0.14.0.99 test regex incorrectly excluded numerals from skill identifiers, counted 29, and attempted to invent `REPLAY_DISCIPLINE` as a 31st code. The live database rejected that migration before modification. The 30 original official study guides and 419 provisional Lab crosswalk entries now match the existing v0.13.4 source codes. Replay Evidence Chronology remains available as a *separate, ungraded supplementary lesson*, not a competency, grade, or additional database row. Existing scores, Lab IDs, books and tool registrations remain unchanged. See `supabase/admin/v0.14.0.101_COMPETENCY_CATALOG_RECONCILIATION_READ_ONLY.sql` for a no-write check of the live catalog.

The generated crosswalk maps from existing `lab-catalog.json`, using lab title, chapter and declared category metadata. Links are **suggestions** for the learner, not verified skill evidence, graded mapping, or historical truth. Automatic matching can produce irrelevant relationships; the Owner may refine each mapping after editorial review. The crosswalk never writes back to `platform_labs`.

**Counts:** 419 canonical Labs; 49 Lab IDs without keyword-grounded candidate competencies. The 30 public study guides cover concepts/observability, step-wise decision procedure, limits, invalidation, common error, one ungraded self-check and a worked conceptual explanation. They do not reproduce paid books and cannot replace the 419 private authored answer sets.

The member Skills page reuses existing `/api/competencies`, private graded training progress, and official competency records. Separate public concept lessons have no paid AI API dependency. A single high knowledge grade CANNOT constitute four-dimensional proficiency, and original made-up replay bars cannot satisfy genuine historical source standards.

### Financial impact
$0 additional spend. No paid APIs or infrastructure, no KDP-exclusive manuscript copies, no market-data redistribution.

## Owner acceptance cross-check
Use the existing Owner Control Center to review every rubric version. This release fixes a hard-coded 700-row list ceiling: the editor now paginates existing private summaries and explicitly refuses to describe a truncated review queue as complete. No answer keys are included in list responses. The read-only source verification is at `supabase/admin/v0.14.0.99_419_LAB_AND_30_SKILLS_ACCEPTANCE_READ_ONLY.sql`.
