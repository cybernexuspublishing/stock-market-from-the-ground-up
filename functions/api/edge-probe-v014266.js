/* v0.14.0.266 nonsecret nested Cloudflare Pages Function dispatch probe */
export function onRequestGet(){return new Response(JSON.stringify({ok:true,route:'api',version:'v014266'}),{status:200,headers:{'content-type':'application/json','cache-control':'no-store','x-gu-probe':'api-v014266'}})}
export function onRequest(){return new Response('Method not allowed',{status:405,headers:{'allow':'GET','cache-control':'no-store'}})}
