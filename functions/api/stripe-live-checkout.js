/* v0.14.0.137 — permanent, unversioned customer Stripe LIVE Checkout API.
 * GET: read-only verified quote, without creating a Checkout Session.
 * POST: existing guarded v58 Stripe checkout + Supabase signed intent path.
 * Keep the old versioned implementation importable for source-test coverage
 * and a controlled backward-compatibility transition.
 * Route must remain included in functions/_middleware.js LIVE_CHECKOUT_ROUTES.
 */
export {onRequestGet,onRequestPost} from './stripe-live-checkout-v01458.js';
