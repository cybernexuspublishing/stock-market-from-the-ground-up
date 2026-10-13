(function(){
  const SAMPLE_LABS=new Set(['F1-C02-L01','F2-C01-L01','F3-C01-L01']);
  function activeEntitlement(rows){
    const now=Date.now();
    return (rows||[]).find(e=>['active','trialing'].includes(e.status) && (!e.starts_at||new Date(e.starts_at).getTime()<=now) && (!e.ends_at||new Date(e.ends_at).getTime()>now));
  }
  function bookCodeToNumber(code){
    const m=String(code||'').match(/(?:BOOK_|BOOK)([123])$/i); return m?Number(m[1]):null;
  }
  async function get(){
    const sb=await window.getSupabaseClient?.();
    if(!sb)return {sb:null,user:null,isMember:false,redeemedBooks:new Set(),sampleLabs:SAMPLE_LABS};
    const {data:{user}}=await sb.auth.getUser();
    if(!user)return {sb,user:null,isMember:false,redeemedBooks:new Set(),sampleLabs:SAMPLE_LABS};
    const [ent,red]=await Promise.all([
      sb.from('entitlements').select('product_key,status,starts_at,ends_at').eq('user_id',user.id),
      sb.rpc('my_book_key_redemptions')
    ]);
    const redeemedBooks=new Set((red.data||[]).map(r=>bookCodeToNumber(r.book_code)).filter(Boolean));
    const entitlement=activeEntitlement(ent.data||[]);
    return {sb,user,isMember:!!entitlement,entitlement,redeemedBooks,sampleLabs:SAMPLE_LABS,redemptions:red.data||[]};
  }
  function canGuided(access,lab){ return !!(access.isMember || access.redeemedBooks?.has(Number(lab.book)) || SAMPLE_LABS.has(lab.id)); }
  function canAdvanced(access){ return !!access.isMember; }
  window.SiteAccess={get,canGuided,canAdvanced,SAMPLE_LABS};
})();
