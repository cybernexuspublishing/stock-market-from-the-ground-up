/* Server-authoritative Crownlight Sparks catalog for signed-in members. */
import {memberIdentity} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
export async function onRequestGet({request,env}){
 try{
  const a=await memberIdentity(env,request),secret=a.config.secret;
  const h={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
   h.authorization='Bearer '+secret;
  const r=await fetch(a.config.base+
   '/rest/v1/gu_sparks_price_catalog_v1?select=sku,label,description,sparks_cost,duration_hours,category,fulfillment,state&state=eq.active&order=category.asc,sku.asc',
   {headers:h,cache:'no-store'});
  if(!r.ok)throw Error('Catalog unavailable');
  const items=await r.json();
  if(!Array.isArray(items))throw Error('Catalog invalid');
  return new Response(JSON.stringify({ok:true,items:items.map(x=>({
   sku:x.sku,label:x.label,description:x.description,costSparks:x.sparks_cost,
   durationHours:x.duration_hours,category:x.category,fulfillment:x.fulfillment
  }))}),{headers:H});
 }catch(e){return new Response(JSON.stringify({ok:false,error:e?.status===401?
   'SIGN_IN_REQUIRED':'SPARKS_PRICE_UNAVAILABLE'}),{status:e?.status===401?401:503,headers:H});}
}
