/* Public, read-only, first-party storefront presentation (2026-10-27).
 * All purchase authorization remains in the original, server-only checkout.
 * No Stripe, sensitive metadata, member identity, or entitlements are returned.
 */
import {foundingOfferState} from '../_lib/founder-offer-gate-v1.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const limited=(v,n)=>String(v??'').slice(0,n);
const statuses=new Set(['listed','coming_soon','ready_for_review','for_sale','paused','in_development','release_ready','published','selling','unavailable']);
const allowedCats=new Set(['membership','tool','book','bootcamp','course','founding','addon','feature']);
export async function onRequestGet({env}){
 try{
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(env.SUPABASE_SECRET_KEY||'');
  if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!key)
   return json({ok:false,error:'Store catalog is temporarily unavailable.'},503);
  const headers=key.startsWith('sb_secret_')?{apikey:key}:{apikey:key,authorization:'Bearer '+key};
  const query='gu_storefront_items_v014174?select=sku,category,display_name,description,price_label,duration_label,product_page,status,visible,sale_ready,display_order,updated_at&visible=eq.true&order=display_order.asc&limit=150';
  // Cross-check the canonical membership visibility registry; storefront
  // listing flags must not expose plans the Owner has explicitly hidden.
  const plansQuery='platform_plans?select=plan_code,public_visible,active&limit=150';
  const [r,p,layoutResponse,founder,toolResponse]=await Promise.all([
   fetch(base+'/rest/v1/'+query,{headers,cache:'no-store'}),
   fetch(base+'/rest/v1/'+plansQuery,{headers,cache:'no-store'}),
   fetch(base+'/rest/v1/gu_store_layout_v1?select=tool_columns,tool_rows,catalog_columns,catalog_rows&singleton=eq.true&limit=1',{headers,cache:'no-store'}).catch(()=>null),
   foundingOfferState(env),
   fetch(base+'/rest/v1/platform_tools?select=tool_code,status,active,public_visible,checkout_enabled,metadata&limit=150',{headers,cache:'no-store'}).catch(()=>null)
  ]);
  if(!r.ok||!p.ok)return json({ok:false,error:'Store catalog is temporarily unavailable.'},503);
  const [rows,plans]=await Promise.all([r.json(),p.json()]);
  if(!Array.isArray(rows)||rows.length>150||!Array.isArray(plans)||plans.length>150)throw Error('Invalid catalog');
  // Canonical Tool registry authorization is independent of listing/sale status.
  // Missing registry evidence fails closed rather than showing a readiness badge.
  const toolRows=toolResponse?.ok?await toolResponse.json().catch(()=>[]):[];
  const betaReadyTools=new Set((Array.isArray(toolRows)&&toolRows.length<=150?toolRows:[])
   .filter(t=>t&&t.active===true&&t.public_visible===true&&t.checkout_enabled===true&&t.status==='live'&&
    t.metadata?.beta_testing?.status==='ready_for_beta_testing')
   .map(t=>String(t.tool_code||'')));
  const visiblePlans=new Set(plans.filter(x=>x?.active===true&&x.public_visible===true).map(x=>String(x.plan_code||'')));
  const knownPlans=new Set(plans.map(x=>String(x.plan_code||'')));
  const items=rows.filter(x=>x?.visible===true&&allowedCats.has(x.category)&&
   (founder.offersVisible===true||!(x.category==='founding'||/FOUNDING_(14|30|60)/.test(String(x.sku||''))))&&
   /^[a-z]+:[A-Z0-9_\-]+$/.test(String(x.sku||''))&&
   (!String(x.sku).startsWith('plan:')||!knownPlans.has(String(x.sku).slice(5))||visiblePlans.has(String(x.sku).slice(5)))).map(x=>({
   sku:limited(x.sku,90),category:x.category,name:limited(x.display_name,220),
   description:limited(x.description,1600),price:limited(x.price_label,100),
   duration:limited(x.duration_label,100),status:statuses.has(x.status)?x.status:'unavailable',
   saleReady:x.sale_ready===true,
   betaTestingReady:x.category==='tool'&&x.sale_ready===true&&x.status==='for_sale'&&
     betaReadyTools.has(String(x.sku).slice(5)),
   updatedAt:/^\d{4}-\d{2}-\d{2}T/.test(String(x.updated_at||''))?x.updated_at:null,
   displayOrder:Number.isInteger(x.display_order)?x.display_order:9999,
   // Only local, rootless .html product destinations may be exposed.
   page:/^[a-z0-9-]+\.html$/.test(String(x.product_page||''))?x.product_page:null
  }));
  let layout={tool_columns:5,tool_rows:5,catalog_columns:5,catalog_rows:3};
  if(layoutResponse?.ok){const setting=(await layoutResponse.json().catch(()=>[]))?.[0];
   if(setting)for(const key of Object.keys(layout)){
    const v=Number(setting[key]);if(Number.isInteger(v)&&v>=1&&v<=12)layout[key]=v;
   }
  }
  return json({ok:true,source:'verified_storefront',items,count:items.length,layout});
 }catch{return json({ok:false,error:'Store catalog is temporarily unavailable.'},503)}
}
