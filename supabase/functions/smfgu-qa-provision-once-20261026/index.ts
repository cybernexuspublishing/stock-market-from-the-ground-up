// Noncommercial QA provisioning completed on 2026-10-26 (7/7).
// The only permitted one-time request was consumed. Runtime permanently retired,
// and JWT verification restored. This code cannot create or modify identities.
Deno.serve((_request: Request) => new Response(
 JSON.stringify({ok:false,error:'One-time QA provisioning endpoint retired'}),
 {status:410,headers:{'content-type':'application/json','cache-control':'no-store'}}
));
