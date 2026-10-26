# Digital catalog refinement

Project: The Stock Market: From the Ground Up
Branch: main
Status: Source checks passed; deployment verification recorded in release response.
Purpose: Implement Owner-requested digital catalog presentation, separate Founding Membership selection, and checkmark/X benefit comparisons.

## Requirements and implementation

- Owner catalog request: four exclusive Store tabs, including Founding Memberships. Keyboard arrows, Home/End and direct hash selection retain the existing controller.
- Founder offers: read the existing approved `data/founding600-terms-v014170.json`. Display both recurring offers, shared 600-place program, discounts, included Sparks and eligibility notes. No new checkout, reservation or entitlement path. Full terms and enrollment remain on the canonical Founding 600 page.
- General membership comparison: included/not-included marks have accessible names and visible conditional notes. Billing and sponsorship remain text rather than misleading yes/no claims.
- Existing membership page: accessible coverage symbols and comparison styling.
- All-products catalog: refined searchable shelves and separate founder category. Upcoming-product publication continues to require the existing server override; no hidden offering is made public by the category filter.
- Books: concise visible summaries link to full product descriptions. Tools: responsive product shelves. No product descriptions, prices or records changed.

## Dependencies and boundaries

No database migration, provider configuration, token permissions or payment write. Terms JSON is existing approved display data, never a payment authority. Standard Store prices and availability still use the existing verified catalog. Labs and Boot Camp teaching files are untouched. No member sidebar added to public pages.

## Executed checks

- JavaScript syntax: Store, inventory UI and membership renderer.
- Build: scripts/build-pages.sh.
- Store category HTML and product contracts.
- Store interaction test, extended to four tabs, founder prices/discounts, read-only terms loading, comparison accessibility and no founder checkout URLs.
- Unified storefront inventory; Store visibility; Owner Store acceptance; Store display contracts.

These checks do not constitute authenticated payment or entitlement acceptance. Live payments remain excluded.

## Rollback

Revert this catalog source commit as one unit. No SQL or provider rollback is required.
