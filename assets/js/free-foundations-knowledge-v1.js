/* Free Foundations Knowledge Library v1. Original beginner instruction.
 * Educational examples are FICTIONAL; no orders, live data, portfolio advice,
 * protected answer keys, grading, payment, identity data, or API calls.
 */
(function(root){'use strict';
const topics=Object.freeze([
 {id:'goals',title:'Saving, investing, goals and time horizon',day:5,
  teach:'Saving preserves money for near-term needs in an accessible place; investing commits capital to assets that may rise or fall in value. A financial goal defines what the money is for, when it will be needed and what losses could be endured. An emergency reserve and essential living costs should not depend on a speculative trade. Time horizon and risk tolerance shape decisions before any chart is opened.',
  why:'The same risky investment can be unsuitable for a near-term bill and potentially tolerable for a much longer-term objective. The member needs a plan, not a prediction.',
  method:['State the goal and the date money may be needed.','Identify essential savings and emergency needs separately.','Compare the possibility of losing principal with your actual ability and willingness to bear that risk.','Decide whether investing, saving, or waiting requires further learning.'],
  example:'FICTIONAL: Jordan needs $1,200 for a bill in eight weeks and has $1,200 available. Treating the whole amount as money for a volatile stock would expose the bill to market losses. No stock forecast changes that immediate obligation.',
  question:'Which information must Jordan establish before selecting an investment, and why is a possible gain insufficient justification?',
  review:'The purpose, deadline, liquidity needs, emergency funds and loss tolerance come first. There is no guaranteed investment outcome; a near-term obligation should not be funded through speculative risk.',
  mistake:'A popular ticker does not replace a personal financial plan. Historical returns are not promised future results.',
  source:'SEC Investor.gov — Introduction to Investing',url:'https://www.investor.gov/introduction-investing'},
 {id:'instruments',title:'Stocks, bonds, funds, ETFs and indexes',day:1,
  teach:'A stock represents an ownership interest in a company. A bond generally represents a debt obligation. A mutual fund or exchange-traded fund (ETF) holds a portfolio under stated rules and costs. An index is a benchmark measuring a defined group of securities; a fund may try to follow it, but the index itself is not the same thing as a directly purchased share. Funds can be diversified or narrowly concentrated. These products have different risks and liquidity characteristics.',
  why:'A beginner should recognize the instrument before interpreting a price chart or making any comparison.',
  method:['Identify what is owned or owed.','Read the product objective and holdings rather than trusting its name.','Identify fees, liquidity and concentrated exposures.','Explain what the displayed price does not reveal.'],
  example:'FICTIONAL: A $20 individual stock depends heavily on one company. A $20 technology-only ETF holds several companies but can still concentrate in the same industry. A broad index fund and a bank deposit are different products with different protection and risk.',
  question:'Does owning several securities inside a sector ETF automatically remove the risk of a technology-sector downturn?',
  review:'No. Multiple holdings can still share the same sector or market risk. Review fund holdings and exposure; an index, an ETF and an individual stock are not interchangeable.',
  mistake:'A low share price is not proof that an investment is cheaper or safer.',
  source:'SEC Investor.gov — Investment Products',url:'https://www.investor.gov/introduction-investing/investing-basics/investment-products'},
 {id:'venues',title:'How stock markets, brokers and quotes fit together',day:1,
  teach:'Companies issue shares to raise capital in a primary offering; investors subsequently trade many of those shares in secondary markets. A broker handles account and order services, while markets and other permitted execution venues match orders. An exchange quote, a consolidated quote, a last sale and a broker order status are different facts. No chart or Level II screen by itself confirms that an individual order was accepted or filled.',
  why:'A trustworthy trading decision starts with the actual source and meaning of each market observation.',
  method:['Distinguish original issuance from secondary trading.','Locate the broker, security identifier, quote source and timestamp.','Separate bid, ask, last trade and available size.','Check order status from the broker before treating a position as real.'],
  example:'FICTIONAL: DEMO has a last trade of $10.00 and an ask of $10.08 for only 20 displayed shares. Someone considering 100 shares cannot assume all 100 will fill at $10.00 or $10.08.',
  question:'What does a displayed last trade establish, and what would confirm a new order was filled?',
  review:'Last trade is a historical execution. Current quotes can change; a broker-confirmed execution record establishes an actual fill, which the educational website never creates.',
  mistake:'A screen showing a trade is not proof that your own hypothetical order executed.',
  source:'SEC Investor.gov — Stocks',url:'https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks'},
 {id:'orders',title:'Market, limit, stop and stop-limit orders',day:5,
  teach:'A market order seeks execution at the best available prices but does not promise a specific price. A buy limit sets the maximum buying price and a sell limit sets the minimum selling price, but a limit may not fill. A stop order becomes a market order after its trigger conditions are met; its stop price is not a guaranteed execution price. A stop-limit order adds a limit, which can leave the order unfilled. Trailing stops adjust their stop reference by a specified price or percentage as favorable prices change; they do not ensure a fill at that trailing reference. Availability, trigger criteria and detailed rules depend on the broker.',
  why:'Risk cannot be planned accurately when order instructions are mistaken for guaranteed fills.',
  method:['Choose whether execution certainty or price control is the priority.','State the trigger, limit and duration when relevant.','Consider partial fills, changing liquidity and cancellation uncertainty.','Check actual broker status rather than inferring execution from a chart.'],
  example:'FICTIONAL: A stock last traded at $10.00. A buy limit at $9.90 might never fill; a market order may fill above $10.00. A sell stop at $9.50 can activate and execute below $9.50 after a fast price gap.',
  question:'Which type constrains a buy price but may not execute, and why is a stop not a guaranteed loss limit?',
  review:'A buy limit specifies a maximum execution price but may not fill. A triggered stop can become a market order and may execute at a worse price; broker rules and session conditions still matter.',
  mistake:'Do not confuse an order submission, acceptance, partial fill, cancellation request and completed execution.',
  source:'SEC Investor.gov — Understanding Order Types (updated 2026)',url:'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-14'},
 {id:'accounts',title:'Cash, margin, settlement and buying power',day:5,
  teach:'A cash account generally relies on cash paid in full for purchases. A margin account may let a customer borrow against eligible securities, exposing the customer to interest, collateral demands, forced liquidation and losses beyond the amount initially invested. For most U.S. stock and ETF transactions, the standard settlement cycle has been T+1 since May 28, 2024: settlement ordinarily occurs one business day after trade date, subject to exceptions. Buying power is not the same as settled cash or a safe risk budget. U.S. FINRA intraday-margin standards changed on June 4, 2026, with a permitted broker transition through October 20, 2027. Older videos describing universal pattern-day-trader trade-count limits may not match the current rules for the learner’s broker.',
  why:'Beginners can create account violations or leverage losses without realizing that a trade and its cash settlement are separate events.',
  method:['Identify cash or margin account type.','Distinguish settled cash, pending proceeds and displayed buying power.','Check the broker’s current restrictions before reusing sale proceeds.','Avoid borrowing or making a real trade based only on this educational example.'],
  example:'FICTIONAL: A sale executes on Monday with no market holiday. Its standard T+1 settlement would ordinarily occur Tuesday, not instantly at Monday execution. Cash-account use of proceeds must follow broker and applicable rules.',
  question:'Is an unsettled sale proceed automatically the same as available settled cash? What extra risk does margin introduce?',
  review:'No. A trade may execute before its associated securities and money settle. Margin borrowing adds cost, margin calls and potentially greater losses; confirm the current broker account rules.',
  mistake:'Do not assume all broker screens use the same definition of available funds.',
  source:'SEC Investor.gov — T+1 Settlement Bulletin',url:'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/new-t1-settlement-cycle-what-investors-need-know-investor-bulletin'},
 {id:'hours',title:'Market sessions, liquidity, volume and trading halts',day:2,
  teach:'Regular U.S. equity trading hours differ from premarket and after-hours sessions. Quotes, available size, spreads and participation can change by session. Volume counts executed quantity, but does not disclose every participant’s intent. Thin liquidity and wide spreads can make an estimated price unrealistic. Daily share volume is not the same as current bid depth: even a heavily traded security may offer little executable size at the proposed exit price. Trading halts and interruptions can prevent prompt execution. Time zones, exchange calendars and whether a chart bar is complete must be recorded before comparing prices.',
  why:'A five-minute candle from a thin extended-hours period should not be treated as equivalent to a liquid regular-session candle.',
  method:['Record the exchange session, time zone and whether the bar is complete.','Compare bid, ask, spread and available size if verified.','Separate reported traded volume from resting quotes.','State whether missing liquidity or a halt justifies NO TRADE.'],
  example:'FICTIONAL: DEMO has a $10.00 bid and $10.40 ask, only 10 shares offered, and a proposed purchase of 100 shares. A $10.20 midpoint is not an assured fill; the $0.40 spread signals execution uncertainty.',
  question:'Why does a completed green candle not prove you can immediately purchase 100 shares at its closing price?',
  review:'The candle reports completed transactions. Current liquidity, spread, session, queue and any halt determine whether a new order could be executed; the close is not a guaranteed offer.',
  mistake:'Price bars and volume do not expose future liquidity or participant motives.',
  source:'FINRA — Frequent Intraday Trading: Understanding the Basics',url:'https://syndication.finra.org/content/frequent-intraday-trading-understanding-basics'},
 {id:'charts',title:'Timeframes, OHLC, volume and technical indicators',day:2,
  teach:'Open, high, low and close summarize prices over a specified period, while volume reports executed quantity. A five-minute candle and a daily candle cover different intervals, and an unfinished candle can still change. A moving average smooths older observations; VWAP is a volume-weighted average over its defined session. Support and resistance describe observed price regions, not barriers that must hold. A doji-like bar has a small open-to-close body, but can still have a wide high-to-low range. OHLC does not establish whether the high preceded the low inside the candle. None of these indicators reveals hidden orders or predicts the next bar with certainty.',
  why:'Technical tools help organize evidence only if the learner understands their calculations and limits.',
  method:['Label the chart’s ticker, source, session, interval and adjusted-data status.','Use a completed candle before calculating its range or body.','Explain what each chosen indicator measures; do not stack tools without purpose.','Record competing scenarios and evidence needed for invalidation.'],
  example:'FICTIONAL: OHLC is 20.00, 21.50, 19.50, 21.00. Body = $1.00; range = $2.00. A nearby prior high may be a reference area, but its existence does not predict an upside breakout.',
  question:'What changes if you switch from a five-minute candle to a one-minute candle, and can VWAP guarantee direction?',
  review:'Each timeframe aggregates different intervals. VWAP summarizes past traded price weighted by volume; it cannot guarantee a future direction, fill, or profitable trade.',
  mistake:'Drawing a line or recognizing a familiar pattern is not an independent risk-managed decision.',
  source:'SEC Investor.gov — Introduction to Investing',url:'https://www.investor.gov/introduction-investing'},
 {id:'fundamentals',title:'Revenue, earnings, dividends and valuation',day:3,
  teach:'Revenue measures sales before expenses; earnings or net income describes profit after applicable expenses. EPS divides applicable earnings by shares under the stated method. A P/E ratio compares a share price with earnings per share, but different accounting periods and negative earnings require care. Dividends are discretionary distributions subject to board and company conditions, not guaranteed payments. Stock splits change the share count and per-share price scale without themselves creating operating profit.',
  why:'Price movements should not replace an understanding of what a company actually reports and what its reports cannot promise.',
  method:['Confirm issuer identity and the reporting period in a primary filing.','Separate revenue, net income, earnings per share and forecasts.','State which denominator and period a valuation ratio uses.','Check share-count changes, corporate actions and assumptions before making comparisons.'],
  example:'FICTIONAL: A share priced at $20 with last-year EPS of $2 would have a simple trailing P/E of 10, assuming compatible definitions. That ratio is not proof the company is underpriced or its shares will rise.',
  question:'If fictional revenue rises but earnings fall, does the revenue increase prove that holders earned a profit?',
  review:'No. Sales and net profit are different. Costs, share counts, accounting periods and expectations all affect interpretation. Even an accurate P/E is not an outcome guarantee.',
  mistake:'Never mistake a company’s market capitalization for cash in the bank or a reported dividend for a promise.',
  source:'SEC Investor.gov — Stocks',url:'https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks'},
 {id:'diversify',title:'Diversification, correlation and concentration risk',day:5,
  teach:'Diversification spreads exposure across investments instead of relying entirely on one company, sector or risk driver. Asset allocation divides money among broad groups such as stocks, bonds and cash. Owning several stocks that respond to the same economic shock may still leave concentrated risk. A narrowly focused ETF can be concentrated even though it holds multiple companies. Diversification manages some risks but cannot prevent losses when many assets decline together.',
  why:'An apparently successful small-stock trade does not describe the risk of an entire portfolio.',
  method:['Identify the type and size of each exposure.','Check sector and holdings overlap instead of counting tickers only.','Relate the portfolio to time horizon and loss tolerance.','Explain which market or company risks remain after diversification.'],
  example:'FICTIONAL: Four positions each worth $250 are all technology companies. The $1,000 portfolio contains four names, but is not automatically diversified across industries or asset classes.',
  question:'How can four different tickers still create concentrated risk, and is diversification a guarantee against loss?',
  review:'They can share sector, market and economic exposures. Diversification can reduce some concentration risk, not eliminate all market losses.',
  mistake:'More tickers do not automatically mean meaningfully different risk drivers.',
  source:'SEC Investor.gov — Asset Allocation and Diversification',url:'https://www.investor.gov/introduction-investing/getting-started/asset-allocation'},
 {id:'costs',title:'Fees, taxes, spreads and realistic performance',day:5,
  teach:'An apparent gain on a chart is not the same as a net investment return. Commission policies, bid–ask spreads, fund expense ratios, interest on borrowed funds, possible regulatory charges and taxes affect outcomes. Tax treatment of realized gains, losses and dividends depends on jurisdiction and individual circumstances. The website can teach arithmetic but cannot determine a member’s tax liability or guarantee how a trade would fill.',
  why:'Small gross gains can be overwhelmed by execution and holding costs; omitting costs gives a misleading impression of skill.',
  method:['Label the hypothetical gross change and quantity.','Subtract known fees and modeled transaction costs separately.','Record costs that are unknown rather than making them zero.','Keep tax and personal investment advice outside a generic educational worksheet.'],
  example:'FICTIONAL: Buy 10 shares at $10.00 and sell at $10.20. Gross difference is $2.00. If modeled total transaction expenses are $1.50, hypothetical pre-tax net difference is $0.50, not $2.00. This is not a broker fill.',
  question:'Why is a $2.00 gross hypothetical price gain not proof of a $2.00 after-cost profit?',
  review:'Fees, spread/slippage, financing and taxes may reduce or reverse the outcome. Real costs require actual transaction records and individual tax facts.',
  mistake:'A paper-trading result must never be presented as a verified real-world return.',
  source:'SEC Investor.gov — Investment Products and Fees',url:'https://www.investor.gov/introduction-investing/investing-basics/investment-products'},
 {id:'protection',title:'Investor protection, brokerage safety and fraud warning signs',day:3,
  teach:'An investment is not a federally insured bank deposit merely because a financial app displays a balance. Eligible deposits at insured banks and broker-held securities involve different protection systems. SIPC can protect certain missing customer assets when an SIPC-member brokerage fails, subject to limits, but does not reimburse market price declines. A promised high return with little or no risk, pressure to act immediately, a lookalike issuer site or a guaranteed profit claim is a reason for independent verification.',
  why:'A beginner must know the difference between custody protections, investment outcomes and promotional claims.',
  method:['Check whether the firm and product are what they claim to be.','Use official regulator or issuer sources instead of links from a promotional message.','Separate account custody protection from market-loss risk.','Refuse urgent claims that cannot be verified; report potential fraud through proper channels.'],
  example:'FICTIONAL: A message promises a 15% weekly stock return and says the app is “SIPC guaranteed.” SIPC membership does not turn the stock into an insured return, and the promise is not credible evidence.',
  question:'Does SIPC coverage mean a legitimately purchased stock cannot fall in price?',
  review:'No. SIPC is not protection from declines in market value. Check the brokerage, original claims and the relevant regulator; do not trust guaranteed-return language.',
  mistake:'Neither a logo nor a brokerage account removes investment risk or proves that marketing is accurate.',
  source:'SEC Investor.gov — SIPC Protection Basics',url:'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/investor-bulletin-sipc-protection-part-1-sipc-basics'},
 {id:'process',title:'Paper practice, no-lookahead reasoning and a learning journal',day:5,
  teach:'Paper practice uses hypothetical decisions without placing market orders. A useful practice record states which data were available before the decision, why the setup was accepted or rejected, the invalidation condition, and what happened only after the decision was recorded. A trade that would have won does not prove a good process; a careful NO TRADE decision can be correct. A pre-entry trade plan and post-event learning journal should separately record ticker, dated thesis, intended position size, entry/stop/goal, and then actual or modeled outcome and costs. The first red completed five-minute candle may prompt a review, but is not proof that the trend ended. Revealed answers and repeated practice build knowledge but cannot substitute for a protected independent assessment.',
  why:'Keeping observation, inference and later outcome separate prevents hindsight from being mistaken for competence.',
  method:['Record the fictional dataset and decision time.','State facts, uncertainty and what future information is still hidden.','Choose paper practice, wait or NO TRADE before seeing more bars.','Review process separately from outcome and write one specific improvement.'],
  example:'FICTIONAL: At 09:30 ET, a learner records “spread unknown; NO TRADE.” Price subsequently rises. The later rise does not retroactively verify liquidity or make the original abstention wrong.',
  question:'What belongs in a study journal before revealing the next candle, and what must never be counted as an actual fill?',
  review:'Record source, timestamp, known facts, uncertain inputs, planned decision and invalidation before revealing. A fictional entry or favorable subsequent move is never a broker-confirmed trade.',
  mistake:'Do not award a mastery badge from local text, hints, a fictional chart outcome or an answer reveal.',
  source:'SEC Investor.gov — Investing on Your Own',url:'https://www.investor.gov/introduction-investing/getting-started/investing-your-own'}
]);
function el(tag,txt,cl){const n=document.createElement(tag);if(txt!==undefined)n.textContent=String(txt);if(cl)n.className=cl;return n}
function render(){
 const rootNode=document.getElementById('academy-free-knowledge');
 if(!rootNode)return;
 const head=el('div',undefined,'gu-free-reference-head');
 head.append(el('p','FREE MEMBERSHIP · NO UPGRADE REQUIRED','gu-free-reference-eyebrow'),
 el('h2','Your Stock Market Foundations Knowledge Library'),
 el('p','The five guided lessons give you hands-on practice. These additional free, self-paced explanations fill the knowledge gaps a new investor should understand before risking money. Every demonstration is fictional, and every exercise is ungraded.'));
 rootNode.append(head);
 const index=el('p','12 core reference topics · No Sparks, grade, or subscription purchase required. You may study them in any order, but start with the guided Free Foundations lessons.');
 index.className='gu-free-reference-intro';rootNode.append(index);
 const list=el('div',undefined,'gu-free-reference-list');
 topics.forEach((topic,i)=>{
  const details=el('details',undefined,'gu-free-reference-topic');details.id='free-topic-'+topic.id;
  details.append(el('summary',String(i+1).padStart(2,'0')+' · '+topic.title));
  const body=el('div',undefined,'gu-free-reference-body');
  body.append(el('h3','Talia teaches the concept'),el('p',topic.teach),
   el('h3','Why this matters'),el('p',topic.why),el('h3','How to work through it'));
  const methods=el('ol');topic.method.forEach(step=>methods.append(el('li',step)));body.append(methods);
  body.append(el('h3','Worked fictional case'),el('p',topic.example),
   el('h3','Your turn — independent, ungraded practice'),el('p',topic.question));
  const label=el('label','Explain your answer before seeing the review');
  const answer=el('textarea');answer.rows=3;answer.maxLength=1200;
  answer.setAttribute('aria-label','Your answer to '+topic.title);
  const reviewBtn=el('button','Compare with Talia’s explanation','btn secondary');
  reviewBtn.type='button';reviewBtn.disabled=true;
  const altBtn=el('button','Teach it another way','btn secondary');altBtn.type='button';
  const msg=el('p');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
  const review=el('section',undefined,'gu-free-reference-review');review.hidden=true;
  review.append(el('h4','Talia’s worked review'),el('p',topic.review),
   el('h4','Common mistake to avoid'),el('p',topic.mistake));
  answer.addEventListener('input',()=>{reviewBtn.disabled=answer.value.trim().length<25;review.hidden=true;msg.textContent=''});
  reviewBtn.addEventListener('click',()=>{if(answer.value.trim().length<25)return;review.hidden=false;
   msg.textContent='Review shown for comparison. Nothing was scored or saved.';});
  altBtn.addEventListener('click',()=>{msg.textContent='Talia: Identify the fact, separate what is assumed, and ask what you would still need to verify. '+topic.mistake});
  const controls=el('div',undefined,'gu-free-reference-actions');controls.append(reviewBtn,altBtn);
  label.append(answer);body.append(label,controls,msg,review);
  const footer=el('p',undefined,'gu-free-reference-footer');
  const source=el('a','Read the authoritative source');source.href=topic.url;source.target='_blank';source.rel='noopener noreferrer';
  const guided=el('a','Practice in Free Foundations Lesson '+topic.day);guided.href='bootcamp-academy.html?program=free5&day='+topic.day;
  footer.append(source,document.createTextNode(' · '),guided);
  body.append(footer,el('p','Educational reference only. No live quote, real order, personalized advice, protected grade, or historical evidence is supplied here.','gu-free-reference-boundary'));
  details.append(body);list.append(details);
 });
 rootNode.append(list);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
root.GroundUpFreeKnowledgeV1=Object.freeze({topics});
})(typeof window==='undefined'?globalThis:window);
