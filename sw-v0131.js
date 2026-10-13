/* Branch reconciliation compatibility shim (v0.13.5.7.1).
 * Legacy v0.13.4 branch retained this URL; NEVER restore the old worker's
 * broad HTML offline caching because authenticated pages must not be cached.
 * Canonical service-worker implementation: /sw-v0135.js.
 */
importScripts('/sw-v0135.js');
