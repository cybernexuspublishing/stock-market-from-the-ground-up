/* Stable, unversioned, member-owned self-service Stripe Billing Portal.
 * Keep historical internal v014122 route for backward compatibility.
 * All session, signed-source, merchant and origin controls stay centralized.
 * Customer cancellation remains available even when new checkout is locked.
 */
export {onRequestPost} from './stripe-billing-portal-v014122.js';
