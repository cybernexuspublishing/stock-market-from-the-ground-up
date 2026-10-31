/* Historical Replay Learning — first sellable beta product presentation.
 * Reuses the single authorized Academy catalog. No second SKU, static
 * financial price, billing action, private assessment or entitlement engine.
 * An active ONDEMAND_MONTHLY plan grants ONDEMAND_TRAINING server-side.
 */
(()=>{'use strict';
const root=document.getElementById('store-training-programs');
if(!root)return;
const expected=new Map([
 ['truth5',{days:5,href:'bootcamp-academy.html?program=truth5'}],
 ['watchlist7',{days:7,href:'bootcamp-academy.html?program=watchlist7'}],
 ['scanners10',{days:10,href:'bootcamp-academy.html?program=scanners10'}],
 ['foundations30',{days:30,href:'bootcamp.html'}],
 ['charts45',{days:45,href:'bootcamp-academy.html?program=charts45'}],
 ['risk60',{days:60,href:'bootcamp-academy.html?program=risk60'}],
 ['practicum90',{days:90,href:'bootcamp-academy.html?program=practicum90'}]
]);
const trainingArtwork=Object.freeze({truth5:'truth5.webp',watchlist7:'watchlist7.webp',scanners10:'scanners10.webp',foundations30:'foundations30.webp',charts45:'charts45.webp',risk60:'risk60.webp',practicum90:'practicum90.webp'});
const make=(tag,value,className)=>{
 const n=document.createElement(tag);
 if(value!==undefined)n.textContent=String(value);
 if(className)n.className=className;
 return n;
};
function status(message){const p=root.querySelector('[data-training-status]');if(p)p.textContent=message;}
function draw(programs){
 const host=root.querySelector('[data-training-courses]');
 if(!host)return;
 host.replaceChildren();
 for(const code of expected.keys()){
  const spec=expected.get(code),item=programs.find(p=>p.code===code);
  const card=make('article',undefined,'store-training-course');
  const art=make('img',undefined,'store-training-course-cover');
  art.src='assets/images/bootcamp-covers/'+trainingArtwork[code];
  art.width=640;art.height=480;art.loading='lazy';art.decoding='async';
  art.alt='';art.setAttribute('aria-hidden','true');
  card.append(art);
  const header=make('div',undefined,'store-training-course-top');
  header.append(make('span',spec.days+' days','store-training-days'),
                make('span','Guided beta curriculum','store-training-kind'));
  card.append(header,make('h3',item.title));
  card.append(make('p',item.summary));
  const limits=make('p','Original independent reflection and practice; no graded competency awarded from completion.','store-training-limits');
  card.append(limits);
  const action=make('a','Explore this Boot Camp','btn secondary');
  action.href=spec.href;
  action.setAttribute('aria-label','Explore '+item.title+' ('+spec.days+' days) in the Academy');
  card.append(action);
  host.append(card);
 }
}
async function init(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),9500);
 try{
  const r=await fetch('/api/bootcamp-academy?action=catalog',{cache:'no-store',signal:controller.signal});
  if(!r.ok)throw Error('Live Academy catalog unavailable.');
  const data=await r.json();
  const rows=data?.programs;
  if(data?.ok!==true||!Array.isArray(rows)||rows.length!==7||
     new Set(rows.map(p=>p.code)).size!==7||
     !rows.every(p=>expected.has(p.code)&&expected.get(p.code).days===p.days&&
       typeof p.title==='string'&&p.title.trim().length>=8&&
       typeof p.summary==='string'&&p.summary.trim().length>=25))
   throw Error('Academy catalog differs from this membership scope.');
  draw(rows);
  status('Seven Academy program routes are listed in the live curriculum. Open any course to confirm your account access and current lesson availability. Individual assessments may still be under review.');
 }catch(error){
  // Losing a catalog read must never turn an unknown curriculum into a false
  // paid promise or redirect the member to a payment page.
  status('The current Academy program list could not be verified. '+
   'Review the Academy before purchasing; no payment has been initiated.');
  const retry=make('a','Open Boot Camp Academy','btn secondary');
  retry.href='bootcamp-academy.html';
  root.querySelector('[data-training-courses]')?.replaceChildren(retry);
 }finally{clearTimeout(timeout);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init(),{once:true});
else void init();
})();