# Market Commons forum presentation

Project: The Stock Market: From the Ground Up
Branch: main
Status: Source implementation and regression checks passed; live authenticated visual acceptance is separate.
Purpose: Owner-requested conventional forum presentation, including a visible founding forum section.

## Scope and evidence

- Existing `market-commons-platform.js` owns directory, topic and reply rendering. Reused its queries, RLS, composer, moderation/report handlers and paginated routes.
- Forum directory shows grouped boards, recent-snapshot topic/post counts, latest discussion/author/date and real recent-topic links. Snapshot scope remains explicit; counts are not total lifetime activity.
- Directory search filters its boards and recent discussions, hides empty groups and announces no-match results.
- Topic lists retain reply counts and last activity on mobile. Thread pages visually separate author metadata from message bodies and retain report/reply/edit controls.
- Founders Commons is a prominent directory section. The existing server eligibility RPC controls the private destination link; other members see the program information link. No private records, counts or permissions are fabricated or exposed.
- Existing private Founders Commons directory uses row presentation, retaining its authorized records and canonical discussion routes. No duplicate forum or membership record is created.
- Labs, Boot Camps, payment settings and database schemas are untouched. No new dependency, migration, credential or provider permission.

## Executed checks

- JavaScript syntax; full Pages build; whitespace checks.
- Synthetic forum rendering test: category/topic routes, founder/nonfounder links, escaped text, snapshot disclosure, pagination and existing composer binding.
- Existing v105 forum security regression.
- Existing v113 atomic moderation regression.
- Existing v116 atomic member-edit regression.

Synthetic checks do not establish authenticated production acceptance or payment acceptance. No live post, reply, report, member edit or moderation action was performed by this release.

## Rollback

Revert this presentation commit. No data or provider rollback is necessary.

## Arrival spotlight refinement

Owner reported that Founders Commons was not noticeable on initial arrival. The banner now exists in initial HTML immediately after the compact page heading and before asynchronous forum content. Founder eligibility updates its action after authentication and before directory loading. A directory/API failure cannot remove the informational banner. No private record is embedded in the page.

Violet/gold emphasis, a 600 Founder emblem, visible channel descriptions and a prominent gold action distinguish it from ordinary categories. Forum category bars, alternating rows, counts and directory shortcuts reinforce forum conventions. Static and dynamic banner markup use the same eligibility-safe initial destination; the private destination is selected only by the existing authorized access result.

Executed again: rendering/escape/pagination regression, forum security regression, JS syntax, Pages build and whitespace validation. Added regression assertion that the initial spotlight precedes asynchronous content and is not duplicated in the rendered directory. Authenticated live visual review remains unverified in a signed-out browser.
