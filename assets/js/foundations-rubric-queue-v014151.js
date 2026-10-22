/* D11 — private rubric COVERAGE, never a Lab-completion claim. */
(function(root){'use strict';
 const sizes={1:15,2:46,3:33};
 function catalog(rows){
  if(!Array.isArray(rows)||rows.length!==94)throw Error('Incomplete 94-Lab Foundations index');
  const seen=new Set(),counts={1:0,2:0,3:0};
  const result=rows.map(x=>{
   const id=String(x?.id||''),book=Number(x?.book);
   if(!/^F[123]-C\d{2}-L\d{2}$/.test(id)||id[1]!==String(book)||!sizes[book]||
       seen.has(id)||typeof x.concept!=='string'||x.concept.trim().length<8||
       x.concept.toLowerCase()==='historical simulator exercise')
    throw Error('Invalid Foundations source ID/title: '+id);
   seen.add(id);counts[book]++;
   return Object.freeze({id,book,title:x.concept});
  });
  for(const [k,size] of Object.entries(sizes))if(counts[k]!==size)throw Error('Invalid count for Book '+k);
  return Object.freeze(result);
 }
 function summarize(labs,versions,group='ALL'){
  if(!Array.isArray(labs)||labs.length!==94||!Array.isArray(versions)||!['ALL','1','2','3','OTHER'].includes(group))
   throw Error('Incomplete Owner rubric review index');
  const versioned=new Set(),reviewed=new Set();
  for(const r of versions){
   const id=String(r?.lab_id||'');
   if(!/^F[123]-C\d{2}-L\d{2}$/.test(id))continue;
   versioned.add(id);
   if(r.review_state==='reviewed')reviewed.add(id);
  }
  const subset=labs.filter(l=>group==='ALL'||(group!=='OTHER'&&String(l.book)===group));
  return {registered:subset.length,
   versioned:subset.filter(l=>versioned.has(l.id)).length,
   reviewed:subset.filter(l=>reviewed.has(l.id)).length,
   missing:subset.filter(l=>!versioned.has(l.id)),
   evidence:'Rubric record presence only. No verified lesson, grading, historical-data rights or production approval.'};
 }
function otherCatalog(input){
  const rows=input?.labs;
  if(!Array.isArray(rows)||rows.length!==419)throw Error('Canonical 419-Lab source incomplete');
  const expected={FOUNDATION_BOOK_1:15,FOUNDATION_BOOK_2:46,FOUNDATION_BOOK_3:33,
   DAY_TRADING_BOOK_1:150,READING_THE_TAPE:75,SITE_EXCLUSIVE:100};
  const counts={},ids=new Set(),others=[];
  for(const r of rows){
   const id=String(r?.lab_id||''),collection=String(r?.book_code||''),
    title=String(r?.title||'');
   if(!/^[A-Za-z0-9_-]{3,90}$/.test(id)||ids.has(id)||!(collection in expected)||title.trim().length<3)
    throw Error('Invalid canonical 419-Lab ID, source, or title');
   ids.add(id);counts[collection]=(counts[collection]||0)+1;
   if(!collection.startsWith('FOUNDATION_BOOK_'))others.push(Object.freeze({id,title,collection}));
  }
  for(const [category,n] of Object.entries(expected))
   if(counts[category]!==n)throw Error('Unexpected canonical '+category+' total');
  if(others.length!==325)throw Error('Expected exactly 325 remaining Labs');
  return Object.freeze(others);
 }
 function summarizeOther(labs,versions){
  if(!Array.isArray(labs)||labs.length!==325||!Array.isArray(versions))
   throw Error('Missing other-Lab index or private version inventory');
  const saved=new Set(),reviewed=new Set();
  for(const record of versions){
   const id=String(record?.lab_id||'');
   if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))continue;
   saved.add(id);
   if(record.review_state==='reviewed')reviewed.add(id);
  }
  return {registered:325,versioned:labs.filter(l=>saved.has(l.id)).length,
   reviewed:labs.filter(l=>reviewed.has(l.id)).length,
   missing:labs.filter(l=>!saved.has(l.id)),evidence:'Rubric versions only, not a completed lesson'};
 }
 
 root.GroundUpFoundationsRubricQueueV014151=Object.freeze({catalog,summarize,otherCatalog,summarizeOther});
})(globalThis);
