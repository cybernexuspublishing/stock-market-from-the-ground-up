# StocksToTrade public source inventory audit — 2026-10-30

## Result

The checked source registry and discovery batch contain **13 distinct stockstotrade.com URLs**: **12 article candidates and 1 blog index**. They also contain **5 distinct YouTube video URLs**. These are observed links, not a complete census of either publisher. The existing source files do not independently verify that all five videos were uploaded by `@Stockstotrade`. No YouTube transcripts were verified. The combined inventory and machine-readable counts are in `public_source_inventory.csv` and `public_inventory_audit.json`.

## Provenance and method

`public_inventory.py` reads `source_registry_v1.csv` and `discovered_batch_002.csv` locally, validates source domains, normalizes URL forms, and preserves source file and line references. It makes no network requests. The previous automated site crawl and yt-dlp channel extraction modes were removed because the project instructions prohibit crawlers and bulk scrapers. This run found 18 input records, 18 unique URLs, and zero duplicate URL rows. A zero duplicate count does not mean all public sources were found.

## Coverage exceptions

| Surface | Current evidence | Exception |
| --- | --- | --- |
| stockstotrade.com educational pages | 12 article candidate URLs plus 1 blog index | No complete sitemap, archive pagination, category, or canonical census verified. The earlier sitemap index request was reported as 404 and robots.txt was inaccessible in the prior research pass. |
| YouTube videos linked in the source records | 5 observed video IDs | Uploader/channel ownership has not been independently checked for all five; no complete `@Stockstotrade` uploads-tab enumeration verified. |
| @Stockstotrade shorts | 0 separately inventoried | Unenumerated, not confirmed empty. |
| @Stockstotrade streams | 0 separately inventoried | Unenumerated, not confirmed empty. |
| @Stockstotrade playlists | 0 separately inventoried | Unenumerated, not confirmed empty. Playlist count and contained-video count must be kept separate. |
| Transcripts | 0 verified | Video description and title records are metadata only. |

## Research WBS reconciliation

The earlier **96** figure in the referenced conversation is an unverified claim. A search of the current repository's research documentation found no canonical research WBS or task-ID register that could establish its final task count. The defensible WBS count is therefore **undetermined**, not 18 or 96. A source URL, a video ID, a playlist, and a work task are different units and must not be added together. This audit makes no 100% coverage or research-completion claim.

## Change boundary and verification

Only research documentation and the offline inventory utility changed. Production pages, curriculum, and private observations were untouched. Verification: the utility completed successfully on the two committed inputs and produced the stated counts; no live-site or channel completeness test was performed.
