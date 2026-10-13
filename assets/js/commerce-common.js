window.CommerceTools=(function(){
  const moneyCents=n=>Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
  const money=n=>Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeHref=url=>{const s=String(url||'').trim();return /^https:\/\//i.test(s)||/^(?:\.\/)?[A-Za-z0-9_\-]+\.html(?:[?#].*)?$/.test(s)||/^\/[A-Za-z0-9_\-\/.]+(?:[?#].*)?$/.test(s)?s:''};
  function mapProduct(p){return {productCode:p.product_code,type:p.product_type,title:p.title,shortTitle:p.short_title,author:p.author,publisher:p.publisher,description:p.description||'',family:p.family||'',branchSlug:p.branch_slug||p.family||'',publicationStatus:p.publication_status||'coming_soon',includedLifetime:p.included_lifetime!==false,kdpSelect:!!p.kdp_select,amazon:{kindleUrl:p.amazon_kindle_url||'',paperbackUrl:p.amazon_paperback_url||'',hardcoverUrl:p.amazon_hardcover_url||''},directDigital:{enabled:!!p.direct_digital_enabled,checkoutUrl:p.direct_digital_checkout_url||''},directPhysical:{enabled:!!p.direct_physical_enabled,checkoutUrl:p.direct_physical_checkout_url||''},companionAccess:!!p.companion_access,bookKeyTrialDays:Number(p.book_key_trial_days||0),active:p.active!==false,sortOrder:Number(p.sort_order||100),editionLabel:p.edition_label||'',companionUrl:p.companion_url||'',releaseDate:p.release_date||null,coverImageUrl:p.cover_image_url||'',sampleUrl:p.sample_url||'',storeVisible:p.store_visible!==false,salesStatus:p.sales_status||'coming_soon',amazonKindleEnabled:p.amazon_kindle_enabled!==false,amazonPaperbackEnabled:p.amazon_paperback_enabled!==false,amazonHardcoverEnabled:p.amazon_hardcover_enabled!==false,websiteCheckoutEnabled:!!p.website_checkout_enabled,lemonVariantId:p.lemon_variant_id||'',metadata:p.metadata||{}}}
  function mapPlan(p){return {planCode:p.plan_code,label:p.name,description:p.description||'',priceCents:Number(p.price_cents||0),billingInterval:p.billing_interval,checkoutUrl:p.checkout_url||'',adFree:!!p.ad_free,allTools:!!p.includes_all_tools,allBooks:!!p.includes_all_books,sortOrder:Number(p.sort_order||100),checkoutEnabled:!!p.checkout_enabled,lemonVariantId:p.lemon_variant_id||''}}
  function mapTool(t){return {toolCode:t.tool_code,name:t.name,category:t.category,description:t.description||'',href:t.href||'',status:t.status,priceCents:Number(t.individual_price_cents||0),checkoutUrl:t.individual_checkout_url||'',freePreview:!!t.free_preview,sortOrder:Number(t.sort_order||100),checkoutEnabled:!!t.checkout_enabled,lemonVariantId:t.lemon_variant_id||''}}
  async function staticLoad(){const [cfg,products]=await Promise.all([fetch('data/commerce-config.json',{cache:'no-store'}).then(r=>r.json()),fetch('data/store-products.json',{cache:'no-store'}).then(r=>r.json())]);return {cfg,products,plans:cfg.plans||[],tools:[]}}
  async function load(){
    const fallback=await staticLoad(); fallback.plans=[];
    try{
      if(typeof window.getSupabaseClient!=='function')return fallback;const sb=await window.getSupabaseClient();
      const [pRes,plRes,tRes,sRes]=await Promise.all([
        sb.from('catalog_products').select('*').eq('active',true).order('sort_order',{ascending:true}),
        sb.from('platform_plans').select('*').eq('active',true).eq('public_visible',true).order('sort_order',{ascending:true}),
        sb.from('platform_tools').select('*').eq('active',true).eq('public_visible',true).order('sort_order',{ascending:true}),
        sb.from('site_settings').select('setting_key,value').eq('public_read',true)
      ]);
      if(pRes.error||plRes.error||tRes.error)return {...fallback,plans:[],tools:[],commerceUnavailable:true};
      const settings=Object.fromEntries((sRes.data||[]).map(x=>[x.setting_key,x.value]));
      const cfg={...fallback.cfg,version:String(settings['site.version']||'0.11'),paymentProvider:String(settings['commerce.payment_provider']??fallback.cfg.paymentProvider??''),billingPortalUrl:String(settings['commerce.billing_portal_url']??fallback.cfg.billingPortalUrl??''),supportEmail:String(settings['site.support_email']??fallback.cfg.supportEmail??''),processingFeePolicy:String(settings['commerce.processing_fee_policy']??fallback.cfg.processingFeePolicy??'included_in_list_price')};
      return {cfg,products:(pRes.data||[]).map(mapProduct),plans:(plRes.data||[]).map(mapPlan),tools:(tRes.data||[]).map(mapTool)};
    }catch{return {...fallback,plans:[],tools:[],commerceUnavailable:true}}
  }
  const productMap=products=>Object.fromEntries(products.map(p=>[p.productCode,p]));
  return {money,moneyCents,esc,safeHref,mapProduct,mapPlan,mapTool,load,productMap};
})();
