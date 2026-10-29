import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseGuides,originalGuides,answerFromGuide} from '../functions/_lib/original-competency-tutor-v014100.js';
const read=x=>JSON.parse(readFileSync(new URL('../data/'+x,import.meta.url),'utf8'));
const base=read('competency-study-guides-v01499.json');
const existing=read('tutor-research-guides-v1.json');
const video=read('tutor-video-transcript-research-v1.json');
assert.equal(base.guides.length,30);
assert.equal(existing.guides.length,32);
assert.equal(video.kind,'original_public_tutor_video_transcript_research');
assert.equal(video.count,14);
assert.equal(video.guides.length,14);
assert.equal(new Set(video.guides.map(g=>g.code)).size,14);
for(const g of video.guides){
 assert.equal(g.researchGuide,true);assert.equal(g.supplemental,true);assert.equal(g.officialCompetency,false);
 assert(g.archiveBasis.includes('STT'));assert(g.sourceRefs.length>0);
 assert(['title','concept','procedure','limit','invalidation','commonError','selfCheck','reviewExplanation'].every(k=>typeof g[k]==='string'&&g[k].length>=40));
 assert(!/guaranteed profit|win rate of 90%/i.test(g.concept));
}
const questions=[
 ['VIDEO_CANDLE_SEQUENCE','Candlestick OHLC and intrabar sequence uncertainty'],
 ['VIDEO_STOP_REALITY','Stop market stop limit trailing stop execution limitations'],
 ['VIDEO_DIP_RECLAIM','Opening dip and high level reclaim observational pattern'],
 ['VIDEO_VWAP_AFTERNOON','VWAP holds reclaims afternoon continuation uncertainty'],
 ['VIDEO_BROKER_MARGIN','Cash margin 2026 intraday margin transition']
];
for(const [code,query] of questions){
 const matches=chooseGuides({...base,researchGuides:video.guides},query);
 assert(matches.some(g=>g.code===code),'new video source retrieval missing '+code);
}
const asset={fetch:async req=>{
 const p=new URL(req.url).pathname;
 if(p==='/data/competency-study-guides-v01499.json')return Response.json(base);
 if(p==='/data/tutor-research-guides-v1.json')return Response.json(existing);
 if(p==='/data/tutor-video-transcript-research-v1.json')return Response.json(video);
 return Response.json({error:'missing'},{status:404});
}};
const req=new Request('https://example.test/api/market-tutor-v01492');
const result=await originalGuides({ASSETS:asset},req,'Explain cash margin 2026 intraday margin transition');
assert(result.some(g=>g.code==='VIDEO_BROKER_MARGIN'));
const answer=answerFromGuide(result.find(g=>g.code==='VIDEO_BROKER_MARGIN'),'explain','');
assert(answer.includes('June 4, 2026'));
assert(answer.includes('ungraded'));
const missing={fetch:async req=>{
 const p=new URL(req.url).pathname;
 if(p==='/data/competency-study-guides-v01499.json')return Response.json(base);
 if(p==='/data/tutor-research-guides-v1.json')return Response.json(existing);
 return Response.json({error:'optional unavailable'},{status:404});
}};
const fallback=await originalGuides({ASSETS:missing},req,'candlestick wick candle body');
assert(fallback.some(g=>g.code==='CANDLE_READING'));
const builder=readFileSync(new URL('../scripts/build-pages.sh',import.meta.url),'utf8');
assert(builder.includes('tutor-video-transcript-research-v1.json'));
console.log('PASS video research: 14 original source-constrained ungraded Tutor lessons; canonical competency count 30; original research count 32; optional fallback; public build inclusion.');
