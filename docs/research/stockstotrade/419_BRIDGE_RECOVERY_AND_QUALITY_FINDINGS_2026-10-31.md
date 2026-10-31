# Full 419-bridge source recovery and instructional quality findings — 2026-10-31

**Project:** The Stock Market: From the Ground Up  
**Version:** 1.0 | **Status:** Specific deficiencies verified; editorial sign-off withheld  
**Source blob SHA:** `ceaf6dcfc2243413e2d48f46d06d723d8fb04d2e`  
**Source:** `data/lab-teaching-bridges-v014168.json` (recovered through GitHub blob endpoint).  
**Google Drive:** Not created.

## Measured source-body evidence
- **419/419** actual Lab bodies recovered, unique ID count 419.
- **419/419** contain nonempty Understand, Recognize, Apply, Common Mistake, Limitations, and self-check content. The earlier connector-returned empty content was a retrieval limitation.
- **413/419** reuse the identical sentence `Before practicing, understand what the visible observation does and does not establish.` in their Understand section. Multiple other instructional paragraphs are likewise repeated across 413 Lab bodies.
- **405/419** lack an easily detectable numerical example in the five teaching tabs. This flag is *not* proof that numerical calculation is relevant to every one of those lessons.
- **419/419** lack an explicit separate `transfer` property in this bridge dataset. Transfer may exist in other instructor sources; this is a specific bridge-data deficiency, not proof that the whole site lacks transfer functionality.
- A repeated self-check phrasing appears in up to 52 Lab records. Unique substantive assessment/grade quality is not demonstrated by this file.
- A complete row-level defect ledger is committed as `419_bridge_quality_defects_2026-10-31.csv`.

## Instructional interpretation
These bridges are insufficient by themselves to certify all Labs as having original, first-principles, subject-specific teaching. They provide the correct access keys and structural tabs, but recurring generic instructional content makes blanket editorial approval inappropriate.

## Remediation and evidence boundaries
1. Retain all canonical 419 Lab identifiers and the original 30 competencies.
2. Replace reusable boilerplate with subject-specific explanation, observed and counterexample cases, calculation where appropriate, source limitations, and fresh independent transfer.
3. Ensure the actual v3 instructor and protected assessment service is checked before claiming any new transfer field is supported by the UI.
4. Verify regulatory, exchange and market-data assertions against effective-date primary sources; examples using fictional numbers must be labelled fictional.
5. Audit each published assessment and its server-side private rubric without shipping answer keys publicly.
6. Preserve 247 Academy day positions plus five Free Foundations days; quality improvements must not expand the 671-unit controlling baseline.

**Result:** 671-unit inventory stable; 419 source bodies now available; individual lesson approval remains blocked by substantive content deficiencies.
