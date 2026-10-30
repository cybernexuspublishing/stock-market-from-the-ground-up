/* Verified first-party imagery for public catalog listings.
 * Book SKUs use actual edition covers. All other mappings use educational
 * topic illustrations, not fictitious product photographs. No remote links.
 */
(()=>{'use strict';
const books=Object.freeze({
 FOUNDATION_BOOK_1:'assets/images/books/foundation-book-1.webp',
 FOUNDATION_BOOK_2:'assets/images/books/foundation-book-2.webp',
 FOUNDATION_BOOK_3:'assets/images/books/foundation-book-3.webp',
 DAY_TRADING_BOOK_1:'assets/images/books/day-trading-book-1.webp',
 READING_THE_TAPE:'assets/images/books/reading-the-tape.webp'
});
const memberships=Object.freeze({"FREE":"assets/images/memberships/SMFGU_Free_Product.webp","FOUNDING_14":"assets/images/memberships/SMFGU_Founding_14_Day_Product.webp","FOUNDING_30":"assets/images/memberships/SMFGU_Founding_30_Day_Product.webp","FOUNDING_60":"assets/images/memberships/SMFGU_Founding_60_Day_Product.webp"});
const tools=Object.freeze({
 INTERACTIVE_LEARNING:'assets/img/store-tools/interactive-learning.svg',
 JOURNAL_ANALYTICS:'assets/img/store-tools/journal-analytics.svg',
 MARKET_SIMULATOR:'assets/img/store-tools/market-simulator.svg',
 MARKET_TUTOR:'assets/img/store-tools/market-tutor.svg'
});
const concepts=Object.freeze({
 'BC-05-TRUTH':'sec-filings','BC-07-WATCH':'candidate-quality',
 'BC-10-SCAN':'catalyst-analysis','BC-30-CORE':'chart-structure',
 'BC-45-CHART':'multi-timeframe','BC-60-RISK':'risk-per-share',
 'BC-90-PRACT':'independent-plan','SC-07-CANDLE':'candle-reading',
 'SC-10-TAPE':'tape-reading','SC-10-VWAP':'vwap-context',
 'SC-07-NEWS':'catalyst-analysis','SC-07-EDGAR':'sec-filings',
 'SC-10-SIZING':'position-sizing','SC-07-BREAK':'breakout-recognition',
 'SC-07-JOURNAL':'mfe-mae-review',
 DISCOVERY_LAB:'candidate-quality',SCANNER_BUILDER:'catalyst-analysis',
 WATCHLIST_WORKBENCH:'candidate-quality',CATALYST_RESEARCH:'sec-filings',
 FLOAT_SUPPLY_LAB:'float-supply',MARKET_STRUCTURE_LAB:'chart-structure',
 MULTI_TIMEFRAME_LAB:'multi-timeframe',RISK_POSITION_LAB:'position-sizing',
 EXECUTION_LAB:'order-selection',LIQUIDITY_SPREAD_LAB:'slippage-spread',
 HALT_SSR_LAB:'halts-luld',PATTERN_FAILURE_LIBRARY:'failed-breakout',
 ORDER_FLOW_TAPE_LAB:'level2-reading',MARKET_CONTEXT_LAB:'market-regime',
 TRADE_REVIEW_REPLAY:'mfe-mae-review',STRATEGY_VALIDATION:'independent-plan',
 OPTIONS_LAB:'risk-reward',ONDEMAND_TRAINING:'chart-structure',
 GUIDED_HISTORICAL_LABS:'candle-reading',SKILL_ASSESSMENTS:'independent-plan',
 HISTORICAL_REPLAY_TRAINING:'chart-structure',LEARNING_PROGRESS:'mfe-mae-review',
 DATA_CONNECTIONS:'sec-filings',SAMPLE_INTERACTIVE_LABS:'candle-reading'
});
const fallback=Object.freeze({
 book:'assets/images/admin-illustrations/learning-system.svg',
 tool:'assets/img/store-tools/interactive-learning.svg',
 course:'assets/images/skill-illustrations/chart-structure.svg',
 bootcamp:'assets/images/skill-illustrations/chart-structure.svg',
 addon:'assets/images/admin-illustrations/learning-system.svg',
 founding:'assets/images/admin-illustrations/market-community.svg',
 feature:'assets/images/admin-illustrations/learning-system.svg'
});
function resolve(item){
 const sku=String(item?.sku||item?.toolCode||'').split(':').pop();
 const category=String(item?.category||'').toLowerCase();
 const book=books[sku],membership=memberships[sku],tool=tools[sku],topic=concepts[sku];
 const src=book||membership||tool||(topic?'assets/images/skill-illustrations/'+topic+'.svg':fallback[category]||fallback.feature);
 return {src,alt:book?'Cover of '+String(item?.name||'the book'):membership?'Membership artwork for '+String(item?.name||'the membership'):'Educational illustration for '+String(item?.name||'this product')};
}
window.GroundUpCatalogVisuals=Object.freeze({resolve});
})();
