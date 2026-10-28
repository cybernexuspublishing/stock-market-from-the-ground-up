/* Founding 600 offering visibility, separate from existing LIVE checkout approval.
 * Counts permanent issued founder numbers plus pending reservation capacity.
 * Enrollment and Stripe reservation use their own atomic server gates.
 */
const PAGE_SIZE=600;
function conf(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!key)throw Error('Founding availability not configured');
 return {base,key};
}
export async function foundingOfferState(env){
 const {base,key}=conf(env);
 const headers={apikey:key,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))headers.authorization='Bearer '+key;
 const get=async path=>{
  const r=await fetch(base+'/rest/v1/'+path,{headers,cache:'no-store'});
  if(!r.ok)throw Error('Founding availability could not be confirmed');
  const json=await r.json();if(!Array.isArray(json))throw Error('Unexpected founder registry response');
  return json;
 };
 const [release,members,reservations,offers]=await Promise.all([
  get('gu_founder_release_v014173?select=public_launch_open,enrollment_enabled&singleton=eq.true&limit=1'),
  get('gu_founder_members_v014173?select=founder_number&order=founder_number.asc&limit='+PAGE_SIZE),
  get('gu_founder_reservations_v014173?select=founder_number,reservation_state,expires_at&limit='+PAGE_SIZE),
  get('gu_storefront_items_v014174?select=sku,visible,sale_ready,status&category=eq.founding&limit=12')
 ]);
 if(release.length!==1||typeof release[0].public_launch_open!=='boolean')throw Error('Launch phase unverified');
 const used=new Set(members.filter(x=>Number.isInteger(x.founder_number)).map(x=>x.founder_number));
 // A founder number is never re-sold after being issued, even if a member cancels.
 const now=Date.now();
 for(const r of reservations){
  const state=String(r.reservation_state||'').toLowerCase();
  if(['expired','canceled','cancelled','failed','rejected','finalized','completed','fulfilled'].includes(state))continue;
  const expires=Date.parse(r.expires_at||'');
  if(!Number.isFinite(expires)||expires<=now)continue;
  if(Number.isInteger(r.founder_number))used.add(r.founder_number);
 }
 const full=used.size>=600;
 const publicLaunch=release[0].public_launch_open===true;
 // The Owner's unpublished catalogue must not be advertised as an open
 // founding enrollment. Public offer discovery is separate from paid access.
 const advertised=offers.some(x=>/^founding:FOUNDING_(14|30|60)$/.test(String(x.sku||''))
  &&x.visible===true);
 const saleReady=offers.some(x=>/^founding:FOUNDING_(14|30|60)$/.test(String(x.sku||''))
  &&x.visible===true&&x.sale_ready===true&&x.status==='for_sale');
 return {phase:publicLaunch?'public':'beta',publicLaunch,full,capacity:600,
  occupied:Math.min(used.size,600),remaining:Math.max(0,600-used.size),
  offersVisible:!publicLaunch&&!full&&advertised,
  enrollmentEnabled:release[0].enrollment_enabled===true&&!publicLaunch&&!full&&saleReady};
}
