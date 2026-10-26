# Editorial frontend and member navigation correction

Project: The Stock Market: From the Ground Up. Branch: main.
Date: October 25, 2026 (America/Chicago). Status: local checks executed; deployment reported separately.
Controlling instruction: Owner rejected the public sidebar and boxed presentation. This revision supersedes the earlier public-panel implementation in ea7c58b.

## Resulting behavior

- Public Home, Store, item, membership, sign-in and other public pages have no workspace sidebar or member-menu control, including for signed-in visitors.
- Dashboard and Admin retain their existing private section navigation. On signed-in Labs and Boot Camp screens, member navigation is a nonmodal overlay outside the teaching canvas. Small learning screens reuse the existing canonical mobile drawer. Guest Academy browsing receives no member panel. This does not create or change entitlements.
- Public Store, item coverage, homepage learning links, Dashboard and Admin surfaces use typography, whitespace and divider lines instead of nested rounded cards and gradients. Existing product and payment availability remains authoritative.
- Sign-in had two nested layout owners: navigation.authPageLayout and frontend-complete.authEnhance. The latter now provides only form assistance; the canonical authentication controller owns the sole wrapper. Form fields, submit handlers, password assistance and CAPTCHA enforcement are preserved.
- The sign-in and registration forms use a centered, responsive column. Hidden advertising slots no longer displace the form; authorized ad delivery remains in its existing controller.

## Executed verification

20 workspace viewport/category/section-control fixtures passed. Eight baseline teaching-canvas comparisons passed at 1440px/390px, including no movement when opening the learning menu. Six sign-in/registration layouts centered correctly, with one canonical wrapper and no public member panel. Guest Academy panel exclusion passed. The existing 18 static viewport checks passed, as did premium source, Store visibility, Owner Store, Store display, keyboard bypass and shared-auth contracts. Synthetic fixtures are explicitly separate from authenticated production acceptance.

No Labs/Boot Camp HTML, canvas styles, curriculum definitions, SQL, pricing, entitlements, authentication enforcement or LIVE payment settings were edited. Yahoo production target: account 4fe9e562905cf607b6f004d2374299fc; stock-market-from-the-ground-up-d1r.pages.dev.

Rollback: revert this correction commit; no migration or data rollback. Reverting restores the rejected public sidebar and competing auth wrapper, so evaluate that consequence before using rollback.
