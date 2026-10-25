/* v0.14.0.259 — nonsecret Functions runtime readiness. No DB or payment calls. */
export function onRequestGet(){
 return new Response(JSON.stringify({ok:true,service:'ground-up-pages-functions',version:'v0.14.0.259',readOnly:true}),{
  status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gu-functions':'v014259'}
 });
}
export function onRequest(){
 return new Response(JSON.stringify({ok:false,error:'Method not allowed.'}),{
  status:405,headers:{'content-type':'application/json','cache-control':'no-store','allow':'GET'}
 });
}
