# Platform workspace frontend

Project: The Stock Market: From the Ground Up. Date: 2026-10-25.
Branch: main. Scope: frontend layout and canonical navigation presentation.
Requirements: Owner directive in this session; Master §§5–9, 14; preserve Labs and Boot Camp layouts.

## Implementation

- Existing site.js opts in an explicit set of public, member, Admin, Store and item routes. Labs, players, assessments and Boot Camps are excluded.
- Existing navigation.js supplies top navigation and the public site panel from the same filtered menu groups. Member/Admin reuse their existing sidebars and original action nodes. No second authentication, authorization or entitlement service.
- Side panels collapse with an accessible button and a per-surface local preference; member/Admin sections start collapsed on small viewports. Existing canonical mobile site drawer remains responsible for global mobile navigation.
- Shared composition stylesheet scopes all new rules to the opt-in attribute. Dashboard hierarchy, Admin surfaces/tables, Store category tabs/product grids and item coverage/purchase information use the same visual system. Purchase actions remain controlled by existing server/catalog contracts.
- Top navigation supports ArrowDown and Escape with expanded-state feedback. No database, payment-provider, pricing, entitlement, lesson or curriculum definitions changed.

## Validation and limits

`tests/test_workspace_layout_browser.py` uses clearly synthetic session/catalog fixtures and actual frontend files. It checks desktop/intermediate/tablet/mobile containment, toggle behavior, category selection and rendered item details. Eight comparisons measure identical main-canvas geometry on Lab Registry, Lab player, Boot Camp and Academy against baseline assets at 1440px/390px. These are layout checks, not authenticated production acceptance.

Other checks: build; JavaScript syntax; Store visibility, Owner Store and display contracts; premium shell; shared auth singleton; keyboard skip navigation; existing 18 built-static viewport checks.

Deployment and real production readback must be recorded separately. Production account is Yahoo master `4fe9e562905cf607b6f004d2374299fc`; hostname `stock-market-from-the-ground-up-d1r.pages.dev`. All LIVE payment restrictions remain controlling. Actual signed-in member and Owner workflow persistence is not certified by synthetic fixtures.

Rollback: revert this release commit; no migration or data rollback required. This is a frontend release, not certification that the complete website is production-accepted.

## Executed results

20 synthetic workspace viewport/interaction checks and 8 unchanged teaching-canvas comparisons passed; 18 existing built-static checks passed. Store visibility, Owner Store, Store display, premium shell, skip-link and shared-auth contracts passed. Five master-account target checks passed. Source changes are restricted to site/navigation/composition, the QA workflow and test/evidence files. Newer Academy source from upstream main was preserved unchanged. Production sign-in/save/readback remains outside these fixture results.
