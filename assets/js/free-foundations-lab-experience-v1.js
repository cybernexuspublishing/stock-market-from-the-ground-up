/* Free Foundations → Full Lab teaching bridge (v1).
 * Five topic-specific fictional rehearsals of the instruction method used in
 * book-companion Labs, including Basic Historical Replay Setup F1-C02-L01.
 * Educational preview only: no market history, private book content, grading,
 * entitlement mutation, payment request or member data persistence.
 */
(function(root){'use strict';
const lessons=Object.freeze({
 1:Object.freeze({title:'Quotes and executed trades',focus:'A last trade is already completed; a displayed quote is not a promised fill.',
  observe:'A fictional last trade prints at $20.00. A later $20.05 ask appears with only 30 displayed shares.',
  decision:'Would you rely on the earlier print as a guaranteed price for a 100-share order?',
  review:'No. The last trade cannot fill a new order. The ask and its displayed size can change before an order reaches the market.',
  extended:'A full book-authorized Lab can add dated quote, spread, liquidity and order-lifecycle exercises.'}),
 2:Object.freeze({title:'Candles, real bodies and wicks',focus:'A completed candle describes its recorded OHLC interval; it does not reveal the next one.',
  observe:'A fictional five-minute candle has O $20.00, H $21.50, L $19.50 and C $21.00.',
  decision:'What does the completed candle establish, and what does it leave unknown?',
  review:'Its body is $1.00 and its full range is $2.00. The next candle and any future execution are unknown.',
  extended:'A full book-authorized Lab can include further candle sequences, independent decisions and eligible replay controls.'}),
 3:Object.freeze({title:'Time-ordered evidence',focus:'Evidence that appeared after the decision pause cannot justify the earlier choice.',
  observe:'At a fictional 09:30 ET pause, a research note is dated 09:29. A second note will not appear until 09:40.',
  decision:'Which note can you use at 09:30 ET, and why?',
  review:'Only the 09:29 note existed at the pause. The 09:40 note is future information and must not be backfilled.',
  extended:'A full book-authorized replay Lab can require verified dates, time zones, source records and locked decision points.'}),
 4:Object.freeze({title:'Watchlist evidence and candidate quality',focus:'Saving a ticker for research does not create a trade or verify a catalyst.',
  observe:'A fictional watchlist candidate has an unverified news headline and no confirmed liquidity information.',
  decision:'Should you mark this candidate ready for execution, or research it first?',
  review:'Research first. Verify the issuer, source, publication time and liquidity rather than treating a scanner row as an order signal.',
  extended:'Eligible advanced Labs can add candidate filters, sourced research and independent watchlist decisions.'}),
 5:Object.freeze({title:'Planning risk without sending an order',focus:'A planned stop distance is a worksheet assumption, not a guaranteed realized loss.',
  observe:'A fictional entry is $10.00 and a planned invalidation price is $9.80. The illustrative risk allowance is $20.',
  decision:'What must you confirm before converting this worksheet into any real order?',
  review:'The planned gap is $0.20/share and theoretical size is 100 shares. Spread, liquidity, slippage and order status remain unknown.',
  extended:'Eligible advanced Labs can add scenario changes, process review, and risk-management assessments where released.'})
});
function el(tag,content,className){
 const e=document.createElement(tag);
 if(content!==undefined)e.textContent=String(content);
 if(className)e.className=className;
 return e;
}
function mount(day,predict,results){
 const item=lessons[day];if(!item||!predict||!results)return false;
 const rehearsal=el('section',undefined,'academy-lab-rehearsal');
 rehearsal.setAttribute('aria-label','Free ungraded replay setup rehearsal: '+item.title);
 rehearsal.append(el('p','TALIA · FIRST LAB-STYLE REHEARSAL','academy-lab-kicker'),
  el('h4','Set up your observation before looking ahead'),
  el('p','Basic Historical Replay Setup teaches a repeatable setup method: identify the source, date, time zone, timeframe, pause, and the facts known at that moment. We will use the same method with FICTIONAL evidence. No historical OHLCV is supplied here.'),
  el('h5',item.title),el('p',item.focus));
 const setup=el('dl',undefined,'academy-lab-setup');
 for(const [key,value] of [['Source','Original fictional educational example'],['Ticker','DEMO — not a listed security'],['Date','Illustrative session only; no verified historical dataset'],['Time zone','U.S. Eastern Time (ET)'],['Timeframe','5-minute teaching interval'],['Decision pause','09:30 ET (fictional)']]){
  setup.append(el('dt',key),el('dd',value));
 }
 rehearsal.append(setup,el('h5','What is visible at this pause?'),el('p',item.observe));
 const label=el('label','Your independent observation: '+item.decision);
 const answer=el('textarea');answer.rows=3;answer.maxLength=700;
 answer.setAttribute('aria-label','Your independent fictional replay decision');
 const actions=el('div',undefined,'academy-lab-actions');
 const commit=el('button','Lock my observation and see Talia’s review','btn secondary');
 commit.type='button';commit.disabled=true;
 const status=el('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const review=el('section',undefined,'academy-lab-review');review.hidden=true;
 review.append(el('h5','Talia reviews the decision — not the outcome'),
  el('p',item.review),
  el('p','Compare your written observation with the facts at the fictional pause. Revise in regular free practice if evidence is missing. This is ungraded; it is not a pass, official assessment, market trade or mastery award.'));
 answer.addEventListener('input',()=>{commit.disabled=answer.value.trim().length<25;review.hidden=true;
  status.textContent=commit.disabled?'Explain the observation in at least 25 characters.':'Ready to compare; your answer stays only in this page.';});
 commit.addEventListener('click',()=>{
  if(answer.value.trim().length<25)return;
  review.hidden=false;status.textContent='Your observation was locked locally for comparison. No grade or server record was created.';
 });
 actions.append(commit);
 rehearsal.append(label,answer,actions,status,review);
 predict.append(rehearsal);
 const preview=el('section',undefined,'academy-lab-value-preview');
 preview.setAttribute('aria-label','What eligible Full Labs add to Free Foundations');
 preview.append(el('p','FREE MEMBER → FULL LAB EXPERIENCE','academy-lab-kicker'),
  el('h4','You have practiced the method. Here is what additional access can offer.'),
  el('p','Your Free lesson already includes original instruction, a fictional demonstration, a written evidence decision and corrective feedback. Paid membership does not replace these essentials. It can expand authorized practice and the range of supported tools.'));
 const table=el('div',undefined,'academy-lab-value-grid');
 const columns=[
  ['Included Free Foundations','Five complete beginner lessons; adjustable fictional evidence; guided practice, hints, retries and private study reflection.'],
  ['Additional authorized Labs',item.extended+' Book-specific and release-specific access requirements still apply.'],
  ['Protected assessment','Only an eligible, released graded assessment can record official competence. Free rehearsals, reveals and skips cannot do so.'],
  ['Historical replay','Actual historical replay requires independently verified and licensed datasets. No such dataset is represented by this fictional sample.']
 ];
 for(const [heading,description] of columns){const card=el('article');card.append(el('h5',heading),el('p',description));table.append(card)}
 preview.append(table);
 const links=el('div',undefined,'academy-lab-actions');
 const labs=el('a','Review available Labs and access','btn secondary');labs.href='labs.html';
 const plans=el('a','Compare current membership benefits','btn secondary');plans.href='membership.html';
 links.append(labs,plans);preview.append(links);
 results.append(preview);
 return true;
}
root.GroundUpFreeLabExperienceV1=Object.freeze({mount,lessons});
})(typeof window==='undefined'?globalThis:window);
