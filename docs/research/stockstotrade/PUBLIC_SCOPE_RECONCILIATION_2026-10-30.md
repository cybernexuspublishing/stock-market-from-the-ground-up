# StocksToTrade public inventory scope reconciliation — 2026-10-30
**Document ID:** SMFGU-RSCH-STT-SCOPE-002
**Status:** Discovery evidence update; NOT exhaustive completion
**Project:** The Stock Market: From the Ground Up
**Version:** 1.0
**Branch:** main
**Google Drive:** not created; GitHub source of record
**Purpose:** Record fresh scope evidence and maintain denominators and acceptance exceptions without inferring a complete census.

## A. GitHub baseline independently read
The existing `PUBLIC_INVENTORY_AUDIT_2026-10-30.md` reconciles 18 unique observed URLs: 12 article candidates, 1 blog index, and 5 YouTube links. The audit explicitly does not verify video ownership or transcripts. The earlier 14 first-party Tutor cards represent user-provided transcript **topics**, not 14 verified video URLs. The reviewed records cannot be used as a full denominator.

## B. Newly located source universe and scope decision
1. **Main publication:** https://stockstotrade.com/ and https://stockstotrade.com/blog/ . Public blog indexes expose featured posts, a category picker and a changing list of popular items. Site also exposes /category/uncategorized/, /platform/, /news/, and multiple capitalization variants of /blog/. Canonical URL reconciliation is required. The dynamic /news/ feed is a distinct rolling news corpus; it is **not automatically included** in the finite educational-article census and must be defined with a snapshot date if in scope.
2. **Help center:** https://help.stockstotrade.com/ . The public homepage explicitly reports **216 articles across 38 sections**, updated Oct 26 2026. This is an additional domain and should be a separate technical/help inventory with its own verified article IDs and totals. Its displayed count is *publisher-reported*, not independently enumerated.
3. **YouTube:** https://www.youtube.com/@Stockstotrade/videos . In current public browsing, the uploads tab returned only a minimal shell, not a video list. The publisher's main /blog/ page advertises **'2K+ videos'**, but this is marketing text, not a reconciled exact channel count. Older third-party estimates have different counts; none is a substitute for enumerated video IDs.
4. **Robots/sitemap:** /robots.txt inaccessible through current web retrieval; /sitemap_index.xml returns 404; /wp-sitemap.xml inaccessible through the same browsing method. These limitations must remain as exceptions; no permission to disregard robots policies is inferred.

## C. Scope-control matrix
| Surface | Evidence available | Acceptance denominator | Current status |
|---|---|---|---|
| Main site educational posts | 12 existing article candidates, plus blog category/navigation evidence | unique accessible canonical in-scope post URLs after full index traversal | UNKNOWN |
| Blog navigation/archive | one existing blog index; category and site links separately observed | unique canonical archive/index pages | UNKNOWN |
| Main site's general marketing/platform pages | home, platform and other paths visible | define in/out scope explicitly | NOT FROZEN |
| Main-site rolling news | /news/ dynamic stream | bounded snapshot as of declared timestamp, if adopted | NOT FROZEN |
| Help center | homepage reports 216 articles, 38 sections | exact unique enumerated help article IDs | 216 reported, 0 reconciled |
| YouTube ordinary uploads | channel uploads tab not enumerated | verified unique publicly accessible channel-upload IDs | UNKNOWN |
| YouTube Shorts, livestreams, playlists | no complete catalog | independent IDs per surface with cross-surface dedup | UNKNOWN |
| Accessible full video transcripts | no verified transcript in this public-inventory pass | unique accessible videos with transcript access | UNKNOWN / 0 verified |
| Source-review tasks | prior chat proposed 96, 120, and 156 | canonical task-ID list with item-specific acceptance evidence | NOT ESTABLISHED |

## D. Specific public source citations (visited 2026-10-30)
- https://stockstotrade.com/blog/ — homepage presents blog topic sections and advertises 2K+ videos; headline and popular article content changes.
- https://stockstotrade.com/category/uncategorized/ — indexed archive with many further articles.
- https://help.stockstotrade.com/ — homepage reports 216 articles/38 sections.
- https://stockstotrade.com/news/ — time-sensitive news stream.
- https://stockstotrade.com/platform/ — commercial tool documentation.
- https://www.youtube.com/@Stockstotrade/videos — content shell, insufficient for enumeration.
- https://stockstotrade.com/sitemap_index.xml — HTTP 404 through current retrieval.
- https://stockstotrade.com/robots.txt — inaccessible through current retrieval.

## E. Acceptance blockers and next evidence gate
1. Explicitly freeze scope: educational main-domain posts, whether technical support docs count, whether rolling news count, whether paywalled university content is excluded, and as-of cutoff for any changing surfaces.
2. Capture and reconcile exact article IDs for the help center; compare against its advertised 216/38.
3. Enumerate the website's accessible canonical educational URLs via permitted navigation/index pages; log discovered vs attempted vs reviewed, duplicates, redirects and inaccessible.
4. Enumerate publicly accessible channel video IDs across videos/shorts/lives/playlists, preserving upload ownership and duplicates; no estimate substitutes for IDs.
5. Create a canonical WBS task-ID register from individually defined, mutually exclusive work units. The earlier claimed 156 was a planning baseline, not a counted audited task register.
6. Certification report must show its denominators, time cutoff, exclusions, source IDs, tested replayability, and unresolved exceptions. A public corpus which changes continuously can be certified only relative to a fixed snapshot.

**Conclusion:** The current GitHub inventory remains a valid partial 18-URL audit. The newly identified Help Center introduces a publisher-reported 216 article scope that was omitted from the original narrow research index. There is no defensible site-and-channel '100%' or final task count yet.
