/* v0.14.0.102 — non-grading writing-structure prompts.
 * Signals mean word mentions only. No numerical score, trade recommendation,
 * hidden rubric evaluation or claim of subject-matter correctness.
 */
const hints=[
 {name:'specific visible evidence',re:/\b(observed|observation|candle|volume|bid|ask|print|quote|level|price|chart|source|timestamp)\b/i,follow:'Name the observation that was actually available at the decision time.'},
 {name:'remaining uncertainty',re:/\b(uncertain|unknown|might|possibly|cannot confirm|not sure|incomplete|limited)\b/i,follow:'State what remains unknown or cannot be inferred from the provided evidence.'},
 {name:'invalidation or risk boundary',re:/\b(invalidat\w*|stop|fail\w*|risk|cancel|exit|reject|no trade)\b/i,follow:'State what new evidence would invalidate the interpretation or require no trade.'}
];
export function ungradedResponseReview(answer){
 const text=String(answer||'').slice(0,1800);
 if(!text.trim())return 'No written reasoning was supplied. Type your observations and explain your uncertainty before requesting a review.';
 const mentions=hints.filter(x=>x.re.test(text)).map(x=>x.name);
 const missing=hints.filter(x=>!x.re.test(text)).map(x=>x.follow);
 const lines=[
  'Reflection-writing check only (keyword mentions, not correctness):',
  mentions.length?'Your text mentions: '+mentions.join('; ')+'.':'Your response does not explicitly mention the three process topics searched for.',
  missing.length?'Consider adding: '+missing.join(' '):'All three writing topics were mentioned. Now check whether each statement has a reliable source, an observable decision boundary and an honest limit.',
  'This check does NOT judge the accuracy of your answer, assess an actual trade, verify market history, or award a competency grade.'
 ];
 return lines.join('\n');
}
