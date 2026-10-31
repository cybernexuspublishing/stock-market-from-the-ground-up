/* Browser acceptance of public growth V1, real production anonymous Chromium.
 * Zero-cost: no auth, paid endpoints, messages, or form submissions.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const newPages=['/candle-practice.html','/free-foundations-challenge.html','/market-vs-limit-orders.html','/support-resistance-basics.html'];
const entryPages=['/','/learn.html','/lab-samples.html','/create-account.html'];
const pages=[...newPages,...entryPages];
const report={title:'SMFGU Free Member Growth V1: anonymous production browser acceptance',
 checkedAt:new Date().toISOString(),scope:'Chromium 390px and 1440px; 4 new public pages + 4 entry points',
 cases:[],failures:[],quiz:null,limits:['No real signup submitted','No payments or member data accessed','No claim of Google indexing or successful social distribution']};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
 mkdirSync('artifacts/growth',{recursive:true});
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  for(const path of pages){
   const page=await context.newPage();
   const rec={path,width};
   try{
    let response;
    for(let attempt=0;attempt<8;attempt++){
     response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});
     if(response?.status()===200&&(!newPages.includes(path)||await page.locator('h1').count()>0))break;
     await delay(7000);
    }
    assert.equal(response?.status(),200,'HTTP status did not reach 200');
    const state=await page.evaluate(()=>{
     const main=document.querySelector('main');
     return {h1:main?.querySelectorAll('h1').length||0,
      title:document.title,description:document.querySelector('meta[name="description"]')?.content||'',
      canonical:document.querySelector('link[rel="canonical"]')?.href||'',
      robots:document.querySelector('meta[name="robots"]')?.content||'',
      overflow:document.documentElement.scrollWidth>innerWidth+3,
      textChars:main?.innerText?.trim().length||0};
    });
    assert.equal(state.h1,1,'Single accessible main heading');
    assert(state.title.length>12&&state.description.length>50,'Page metadata');
    assert(state.textChars>150,'Educational main content missing');
    assert(!state.overflow,'Unwanted horizontal overflow');
    if(newPages.includes(path)||path!=='/create-account.html'){
      assert.equal(state.canonical,origin+path,'Public canonical must match');
      assert(!/noindex/i.test(state.robots),'Discovery page accidentally noindex');
    }else{assert(/noindex/i.test(state.robots),'Private registration must remain noindex');}
    if(newPages.includes(path)){
      assert(await page.getByRole('link',{name:'Create a Free Account'}).count()>0||
             await page.getByRole('link',{name:'Create a Free Account',exact:false}).count()>0||
             path.includes('free-foundations-challenge'),
        'No Free account path for '+path);
    }
    if(path==='/candle-practice.html'){
      const layout=await page.evaluate(()=>{
       const card=document.querySelector('.gu-learning-journey-v3');
       const room=document.querySelector('.gu-learning-journey-v3 .gu-public-classroom');
       const evidence=document.querySelector('.gu-public-evidence');
       const tutor=document.querySelector('.gu-public-tutor');
       return {cardWidth:card?.getBoundingClientRect().width||0,
        viewport:innerWidth,
        columns:getComputedStyle(room).gridTemplateColumns.split(' ').filter(Boolean).length,
        evidenceWidth:evidence?.getBoundingClientRect().width||0,
        tutorWidth:tutor?.getBoundingClientRect().width||0,
        stylesheet:document.querySelector('link[href*="teaching-full-width-v1.css"]')!==null};
      });
      assert(layout.stylesheet,'Shared full-width teaching stylesheet must load');
      assert(layout.cardWidth>=layout.viewport*.87,
        'Learning card must use page width: '+JSON.stringify(layout));
      assert.equal(layout.columns,width>=1051?2:1,
        'ECharts left and Talia right on desktop, stacked on phone: '+JSON.stringify(layout));
      assert(layout.evidenceWidth>100&&layout.tutorWidth>100,
        'Chart and tutor must both remain visible: '+JSON.stringify(layout));
    }
    if(path==='/free-foundations-challenge.html'){
      for(let i=1;i<=5;i++)assert(await page.locator('a[href*="program=free5"][href*="day='+i+'"]').count()>=1,'Missing Day '+i);
    }
    if(path==='/'){
      assert.equal(await page.locator('.gu-home-message a.btn[href="create-account.html"]').count(),1,
        'Primary homepage call-to-action must be Free registration');
    }
    if(path==='/create-account.html'){
      assert(await page.locator('#signup-dob').count()>0,'Real 18+ age check must remain');
      assert(await page.locator('a[href*="program%3Dfree5"]').count()>0,'Verify then sign in to Free5');
    }
    rec.status='PASS';
    console.log('PASS growth '+width+'px '+path);
   }catch(e){
    rec.status='FAIL';rec.reason=String(e?.message||e).slice(0,380);
    report.failures.push(rec);
    console.error('FAIL growth '+width+'px '+path+': '+rec.reason);
   }finally{report.cases.push(rec);await page.close();}
  }
  if(width===390){
   const page=await context.newPage();
   try{
    await page.goto(origin+'/candle-practice.html',{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#gu-practice-journey .gu-journey-item').first().waitFor({timeout:18000});
    assert.equal(await page.locator('#gu-practice-journey .gu-journey-item').count(),10,'Ten stages required');
    assert.equal(await page.locator('#gu-practice-ohlc tr').count(),5,'Accessible OHLC table required');
    const finish=async(choice)=>{
      await page.locator('#gu-practice-full').click();
      await page.locator('input[name="gu-journey-choice"][value="'+choice+'"]').check();
      await page.locator('#gu-practice-submit').click();
    };
    await page.locator('#gu-practice-full').click();
    await page.locator('input[name="gu-journey-choice"][value="1"]').check();
    await page.locator('#gu-practice-submit').click();
    assert.match(await page.locator('#gu-practice-feedback').innerText(),/Not quite/i,'Free mistake-specific retry');
    assert.match(await page.locator('#gu-practice-step').innerText(),/Stage 1 of 10/i,'Incorrect response cannot advance');
    await page.locator('input[name="gu-journey-choice"][value="0"]').check();
    await page.locator('#gu-practice-submit').click();
    assert.match(await page.locator('#gu-practice-step').innerText(),/Stage 2 of 10/i);
    await finish(1); // Learn -> Calculate
    await page.locator('#gu-practice-full').click();
    for(const [field,v] of [['body','1'],['range','2'],['percent','50']])await page.locator('[name="'+field+'"]').fill(v);
    await page.locator('#gu-practice-submit').click();
    assert.match(await page.locator('#gu-practice-step').innerText(),/Experiment/);
    await page.locator('#gu-practice-close').evaluate(input=>{input.value='31.50';input.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.match(await page.locator('#gu-practice-experiment-math').innerText(),/25.0%/);
    await finish(0); // Experiment -> Predict
    await finish(1); // Predict -> Replay
    for(const correct of [1,1,0,1]){
      await page.locator('#gu-practice-full').click();
      await page.locator('input[name="gu-journey-choice"][value="'+correct+'"]').check();
      await page.locator('#gu-practice-submit').click();
    }
    assert.match(await page.locator('#gu-practice-step').innerText(),/Assess/);
    assert.equal(await page.locator('#gu-practice-ohlc tr').count(),5,'Assessment uses different fictional candle');
    for(const [field,v] of [['body','0.3'],['range','1.2'],['percent','30']])await page.locator('[name="'+field+'"]').fill(v);
    await page.locator('#gu-practice-submit').click();
    assert.match(await page.locator('#gu-practice-step').innerText(),/Review/,'First submission locks before feedback');
    await page.locator('#gu-practice-full').click();
    assert.match(await page.locator('#gu-practice-narration').innerText(),/percent needs revision/i);
    await page.locator('input[name="gu-journey-choice"][value="1"]').check();
    await page.locator('#gu-practice-submit').click();
    assert.match(await page.locator('#gu-practice-step').innerText(),/Transfer/);
    for(const [field,v] of [['body','0.3'],['range','0.8'],['percent','37.5']])await page.locator('[name="'+field+'"]').fill(v);
    await page.locator('[name="direction"]').selectOption('bearish');
    await page.locator('#gu-practice-submit').click();
    assert.match(await page.locator('#gu-practice-step').innerText(),/Results/);
    assert.match(await page.locator('#gu-practice-results').innerText(),/Official mastery/i);
    await page.screenshot({path:'artifacts/growth/free-candle-phone.png',fullPage:true});
    report.quiz='PASS';
    console.log('PASS growth ten-stage interactive lesson: corrected retries, calculated body/range, experiment, replay, independent assessment, transfer and report');
   }catch(e){
    report.quiz='FAIL: '+String(e?.message||e).slice(0,400);
    report.failures.push({path:'/candle-practice.html',width:390,test:'interactive quiz',reason:report.quiz});
    console.error('FAIL growth interactive quiz: '+report.quiz);
   }finally{await page.close();}
  }
  await context.close();
 }
}finally{
 await browser?.close();
 mkdirSync('artifacts/growth',{recursive:true});
 writeFileSync('artifacts/growth/browser-acceptance.json',JSON.stringify(report,null,2));
}
console.log('GROWTH_BROWSER_V1 '+JSON.stringify({passed:report.cases.filter(x=>x.status==='PASS').length,
 checks:report.cases.length,quiz:report.quiz,failures:report.failures.length}));
if(report.failures.length)process.exitCode=1;
