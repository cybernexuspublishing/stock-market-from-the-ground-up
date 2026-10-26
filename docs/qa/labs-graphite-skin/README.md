# Graphite Lab presentation overlay

Project: The Stock Market: From the Ground Up
Branch: main
Scope: Lab registry, direct/embedded Lab player and legacy site-lab entry page.
Status: Source/layout guard and Pages build passed; authenticated visual review unverified.
Purpose: Apply Owner-approved modern technical palette while preserving the frozen Lab layout.

One opt-in CSS overlay changes only background/color, border color, shadow, focus/accent/caret color and local color variables. No display, geometry, positioning, dimensions, typography, spacing, transform or animation declaration. No chart SVG/canvas, candlestick colors, progress fill, warning or assessment feedback selector. Existing classes, teaching nodes, IDs, scripts and controls are untouched. Boot Camp pages do not opt into this overlay.

The direct player also supplies the existing embedded Lab iframe, so it receives the same color treatment without any parent/iframe size change. Light-theme and forced-color rules are included.

Validation: JS source guard enumerates the complete CSS property allowlist and checks that all three HTML files are byte-identical to baseline after removing the new CSS link and opt-in marker. Chart/progress/feedback selectors are prohibited. Guard, Pages build and whitespace validation passed. Browser geometry measurements were not performed in this session.

No backend, database, provider, payment, permission, scoring or entitlement changes.
Rollback: remove the three opt-in links/markers and the single skin stylesheet; revert the source commit. No data rollback.
