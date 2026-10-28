/* v0.14.0.35 — Preserve existing commerce API; ensure every approved book has a cover. */
window.CommerceTools=(function(){'use strict';
  const moneyCents=n=>Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
  const money=moneyCents;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeHref=url=>{const s=String(url||'').trim();return /^https:\/\//i.test(s)||/^(?:\.\/)?[A-Za-z0-9_\-]+\.html(?:[?#].*)?$/.test(s)||/^\/[A-Za-z0-9_\-\/.]+(?:[?#].*)?$/.test(s)?s:''};
  const covers=Object.freeze({
   FOUNDATION_BOOK_1:'/assets/images/books/foundation-book-1.webp',
   FOUNDATION_BOOK_2:'/assets/images/books/foundation-book-2.webp',
   FOUNDATION_BOOK_3:'/assets/images/books/foundation-book-3.webp',
   DAY_TRADING_BOOK_1:'/assets/images/books/day-trading-book-1.webp',
   READING_THE_TAPE:'/assets/images/books/reading-the-tape.webp'
  });
  function mapProduct(p){return {
   productCode:p.product_code,type:p.product_type,title:p.title,shortTitle:p.short_title,author:p.author,publisher:p.publisher,
   description:p.description||'',family:p.family||'',branchSlug:p.branch_slug||p.family||'',
   publicationStatus:p.publication_status||'coming_soon',includedLifetime:p.included_lifetime!==false,
   kdpSelect:!!p.kdp_select,amazon:{kindleUrl:p.amazon_kindle_url||'',paperbackUrl:p.amazon_paperback_url||'',hardcoverUrl:p.amazon_hardcover_url||''},
   directDigital:{enabled:!!p.direct_digital_enabled,checkoutUrl:p.direct_digital_checkout_url||''},
   directPhysical:{enabled:!!p.direct_physical_enabled,checkoutUrl:p.direct_physical_checkout_url||''},
   companionAccess:!!p.companion_access,bookKeyTrialDays:Number(p.book_key_trial_days||0),active:p.active!==false,
   sortOrder:Number(p.sort_order||100),editionLabel:p.edition_label||'',companionUrl:p.companion_url||'',releaseDate:p.release_date||null,
   coverImageUrl:p.cover_image_url||covers[p.product_code]||'',sampleUrl:p.sample_url||'',storeVisible:p.store_visible!==false,
   salesStatus:p.sales_status||'coming_soon',amazonKindleEnabled:p.amazon_kindle_enabled!==false,
   amazonPaperbackEnabled:p.amazon_paperback_enabled!==false,amazonHardcoverEnabled:p.amazon_hardcover_enabled!==false,
   websiteCheckoutEnabled:!!p.website_checkout_enabled,lemonVariantId:p.lemon_variant_id||'',metadata:p.metadata||{}
  }}
  function mapPlan(p){return {
    planCode:p.plan_code,label:p.name,description:p.description||'',priceCents:Number(p.price_cents||0),
    billingInterval:p.billing_interval,checkoutUrl:p.checkout_url||'',adFree:!!p.ad_free,
    allTools:!!p.includes_all_tools,allBooks:!!p.includes_all_books,sortOrder:Number(p.sort_order||100),
    checkoutEnabled:!!p.checkout_enabled,lemonVariantId:p.lemon_variant_id||'',metadata:p.metadata||{}
  }}
  function mapTool(t){return {
    toolCode:t.tool_code,name:t.name,category:t.category,description:t.description||'',href:t.href||'',
    status:t.status,priceCents:Number(t.individual_price_cents||0),checkoutUrl:t.individual_checkout_url||'',
    freePreview:!!t.free_preview,sortOrder:Number(t.sort_order||100),checkoutEnabled:!!t.checkout_enabled,lemonVariantId:t.lemon_variant_id||'',
    betaTestingReady:t.active===true&&t.public_visible===true&&t.status==='live'&&t.checkout_enabled===true&&
      t.metadata?.beta_testing?.status==='ready_for_beta_testing'
  }}
  async function staticLoad(){const [cfg,products]=await Promise.all([
    fetch('data/commerce-config.json',{cache:'no-store'}).then(r=>r.json()),
    fetch('data/store-products.json',{cache:'no-store'}).then(r=>r.json())
  ]);const mapped=products.map(p=>({...p,coverImageUrl:p.coverImageUrl||covers[p.productCode]||''}));return {cfg,products:mapped,plans:cfg.plans||[],tools:[]}}
  async function load(){
    const fallback=await staticLoad();fallback.plans=[];
    try{
      if(typeof window.getSupabaseClient!=='function')return fallback;
      const sb=await window.getSupabaseClient();
      const [pRes,plRes,tRes,sRes]=await Promise.all([
        sb.from('catalog_products').select('*').eq('active',true).order('sort_order',{ascending:true}),
        sb.from('platform_plans').select('*').eq('active',true).eq('public_visible',true).order('sort_order',{ascending:true}),
        sb.from('platform_tools').select('*').eq('active',true).eq('public_visible',true).order('sort_order',{ascending:true}),
        sb.from('site_settings').select('setting_key,value').eq('public_read',true)
      ]);
      if(pRes.error||plRes.error||tRes.error)return {...fallback,plans:[],tools:[],commerceUnavailable:true};
      const settings=Object.fromEntries((sRes.data||[]).map(x=>[x.setting_key,x.value]));
      const cfg={...fallback.cfg,version:String(window.SITE_CONFIG?.VERSION||fallback.cfg.version||'unverified'),legacyDatabaseVersion:String(settings['site.version']||''),
        paymentProvider:String(settings['commerce.payment_provider']??fallback.cfg.paymentProvider??''),
        billingPortalUrl:String(settings['commerce.billing_portal_url']??fallback.cfg.billingPortalUrl??''),
        supportEmail:String(settings['site.support_email']??fallback.cfg.supportEmail??''),
        processingFeePolicy:String(settings['commerce.processing_fee_policy']??fallback.cfg.processingFeePolicy??'included_in_list_price')};
      return {cfg,products:(pRes.data||[]).map(mapProduct),plans:(plRes.data||[]).map(mapPlan),tools:(tRes.data||[]).map(mapTool)};
    }catch{return {...fallback,plans:[],tools:[],commerceUnavailable:true}}
  }
  // Read-only status calls match the actual checkout-platform.js route,
  // not potentially stale catalog checkout_enabled fields. NEVER create a
  // Checkout Session here; the protected checkout independently rechecks
  // logged-in eligibility, provider product/price, and signed fulfillment.
  async function verifiedCheckout(catalog,only=null){
    const closed={...catalog,plans:(catalog.plans||[]).map(p=>({...p,checkoutEnabled:false})),
      tools:(catalog.tools||[]).map(t=>({...t,checkoutEnabled:false}))};
    if(catalog.commerceUnavailable||typeof fetch!=='function')return closed;
    let route;
    try{
      const r=await fetch('/api/digital-payment-route-v01432r2',{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!r.ok) return closed;route=await r.json();
    }catch{return closed}
    if(route?.enabled!==true)return closed;
    if(route.provider==='LEMON_SQUEEZY'){
      if(route.checkoutEnabled!==true)return closed;
      return {...catalog,plans:(catalog.plans||[]).map(p=>({...p,checkoutEnabled:p.checkoutEnabled===true})),
        tools:(catalog.tools||[]).map(t=>({...t,checkoutEnabled:t.checkoutEnabled===true}))};
    }
    if(route.provider!=='STRIPE_MANAGED')return closed;
    const plans=(catalog.plans||[]).filter(p=>(!only||only.type==='plan'&&p.planCode===only.code)&&p.planCode!=='FREE'&&Number(p.priceCents)>0);
    const tools=(catalog.tools||[]).filter(t=>(!only||only.type==='tool'&&t.toolCode===only.code)&&t.status==='live'&&Number(t.priceCents)>0);
    const jobs=[...plans.map(p=>({type:'plan',code:p.planCode})),...tools.map(t=>({type:'tool',code:t.toolCode}))].slice(0,60);
    const responses=await Promise.all(jobs.map(async j=>{
      try{
        const url='/api/stripe-live-checkout?type='+encodeURIComponent(j.type)+'&code='+encodeURIComponent(j.code);
        const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
        const answer=response.ok?await response.json():null;
        return answer?.ok===true&&answer.liveCheckoutAvailable===true?j.type+':'+j.code:null;
      }catch{return null}
    }));
    const allowed=new Set(responses.filter(Boolean));
    return {...closed,plans:closed.plans.map(p=>({...p,checkoutEnabled:allowed.has('plan:'+p.planCode)})),
      tools:closed.tools.map(t=>({...t,checkoutEnabled:allowed.has('tool:'+t.toolCode)}))};
  }
  const productMap=products=>Object.fromEntries(products.map(p=>[p.productCode,p]));
  return {money,moneyCents,esc,safeHref,mapProduct,mapPlan,mapTool,load,verifiedCheckout,productMap};
})();
