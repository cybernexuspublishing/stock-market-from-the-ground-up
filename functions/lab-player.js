/* Opt-in reference preview routing; production v3.3 is the default.
 * Two fictional educational demonstrations only. Does not authenticate,
 * grade, save, grant replay rights, debit Question Pass credits, or touch
 * Stripe. Official member learning never redirects to a fictional demonstration. */
const REFERENCES=new Set(['F2-C07-L01','F3-C06-L01']);
export async function onRequest(context){
 const {request}=context;
 const url=new URL(request.url);
 const lab=url.searchParams.get('lab');
 if((request.method==='GET'||request.method==='HEAD')&&REFERENCES.has(lab)&&url.searchParams.get('demo')==='1'){
  const dest=new URL('/lab-v32-member.html',url);
  dest.searchParams.set('lab',lab);
  return new Response(null,{
   status:302,
   headers:{location:dest.toString(),'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'}
  });
 }
 return context.next();
}
