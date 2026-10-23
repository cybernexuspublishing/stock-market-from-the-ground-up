/* Deployment 09: deterministic source-only retrieval.
 * Source records remain controlled by existing approved course catalogs.
 * This module never reads private rubrics, model outputs, or market feeds.
 */
const STOP=new Set('what when that this about explain please would could should mean tell teach learning practice with from into your have does difference between compare versus versus the and are for how why who which'.split(' '));
const ALIASES=Object.freeze({
 'volume weighted average price':'vwap',
 'moving average exponential':'ema',
 'exponential moving average':'ema',
 'time and sales':'tape',
 'time & sales':'tape',
 'level 2':'level ii',
 'level two':'level ii',
 'premarket high':'pmh',
 'previous day high':'pdh',
 'high of day':'hod',
 'low of day':'lod',
 'higher high':'hh',
 'higher low':'hl',
 'lower high':'lh',
 'lower low':'ll',
 'maximum favorable excursion':'mfe',
 'maximum adverse excursion':'mae'
});
function normalize(value){
 let s=String(value??'').toLowerCase().normalize('NFKC').replace(/[\u0300-\u036f]/g,'');
 s=s.replace(/&/g,' and ').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
 for(const [phrase,short] of Object.entries(ALIASES)){
  const p=phrase.replace(/&/g,' and ').replace(/[^a-z0-9 ]+/g,' ').trim();
  // Expand *every* occurrence. A repeated student phrase must not leave
  // stray words that distort source relevance and cited-topic selection.
  s=s.replace(new RegExp('(^| )'+p+'(?= |$)','g'),(_match,leading)=>leading+short);
 }
 return s;
}
export const terms=value=>[...new Set(normalize(value).split(' ').filter(w=>w.length>1&&!STOP.has(w)))];
export function rankApprovedTutorTopics(query,topics,max=3){
 const words=terms(query);if(!words.length)return [];
 const q=new Set(words);
 return (Array.isArray(topics)?topics:[]).filter(t=>t&&typeof t.title==='string'&&typeof t.summary==='string')
  .map(t=>{
   const fields=[
    [t.title,8],[(Array.isArray(t.aliases)?t.aliases:[]).join(' '),7],
    [(Array.isArray(t.related)?t.related:[]).join(' '),3],[t.summary,1]
   ];
   let score=0;
   for(const [v,weight] of fields)for(const token of terms(v))if(q.has(token))score+=weight;
   return {t,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.t.id).localeCompare(String(b.t.id)))
  .slice(0,Math.max(0,Math.min(3,Number.isInteger(max)?max:3))).map(x=>x.t);
}
