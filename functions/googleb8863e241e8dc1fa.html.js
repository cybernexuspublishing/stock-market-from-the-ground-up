/* Google Search Console URL-prefix ownership verification.
 * Preserve the Owner-provided 53-byte token exactly; avoid Pages .html redirects.
 * This public route never reads private member information.
 */
const verification='google-site-verification: googleb8863e241e8dc1fa.html';
const headers={
  'content-type':'text/plain; charset=utf-8',
  'cache-control':'public, max-age=3600',
  'x-content-type-options':'nosniff'
};
export function onRequestGet(){return new Response(verification,{status:200,headers});}
export function onRequestHead(){return new Response(null,{status:200,headers});}
