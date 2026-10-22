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
 root.GroundUpFoundationsRubricQueueV014151=Object.freeze({catalog,summarize});
})(globalThis);
