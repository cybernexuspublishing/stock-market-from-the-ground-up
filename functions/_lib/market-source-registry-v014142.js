/* v0.14.0.142 — reviewed source metadata only, no live readiness claim.
 * Owner Roadmap is the single controlling tracker. This is NOT a new market
 * subscription SKU, API key store, data license, or production dataset.
 */
export const marketSourceRegistryV014142=Object.freeze({
 version:'0.14.0.142',
 publicReleaseApproved:false,
 commercialPublisherApproval:'NOT_CERTIFIED',
 sources:Object.freeze([
  Object.freeze({
   code:'IEX_HIST',name:'IEX Exchange Historical Data (HIST)',
   category:'historical_venue_trades_quotes_depth',cost:'FREE_HIST_DOWNLOAD',
   credential:'NO_API_KEY_PUBLISHED_FOR_HIST',availableFeedScope:'IEX_SINGLE_VENUE_ONLY',
   coverage:'TRAILING_12_MONTHS_ADVERTISED',
   terms:'https://www.iex.io/legal/hist-data-terms',
   guide:'https://www.iex.io/products/equities/market-data-connectivity',
   retrieval:'PCAP_DOWNLOAD_T_PLUS_ONE',
   localPipeline:'TOPS_1_6_CLASSIC_PCAP_QUARANTINED_DRAFT_ONLY',
   observedLiveCapture:'NOT_TESTED',
   commercialReuse:'CONDITIONAL_TERMS_AND_ATTRIBUTION_NOT_FINAL_PUBLICATION_APPROVAL',
   warnings:['Not SIP consolidated volume, NBBO or total market',
    'Review feed flags, gaps, adjustments, licensing and exact date',
    'Trade decoder does not establish quotes, depth or actual brokerage fills',
    'No authenticated IEX login or downloaded real file verified']
  }),
  Object.freeze({
   code:'TIINGO_BYO',name:'Tiingo — Member-Owned API Token',
   category:'private_per_member_provider_data',cost:'INDIVIDUAL_FREE_TIER_ADVERTISED',
   credential:'EACH_MEMBER_REGISTER_PERSONAL_TOKEN_NO_SHARED_PLATFORM_ACCOUNT',
   terms:'https://app.tiingo.com/tos/',
   guide:'https://www.tiingo.com/documentation/appendix/developers',
   retrieval:'MEMBER_BYO_ENCRYPTED_TOKEN_PRIVATE_ON_DEMAND',
   localPipeline:'NO_PUBLIC_CACHE_NO_AUTOMATIC_COMMERCIAL_REPUBLICATION',
   observedLiveCapture:'NOT_TESTED',
   commercialReuse:'NO_REDISTRIBUTION_BASIC_POWER_OR_STANDARD_COMMERCIAL_TIERS',
   warnings:['Tiingo developer program requires each individual to register their own API account',
    'Free plan is internal/personal use only: no shared platform account or commercial reposting',
    'Do not create duplicate accounts to circumvent provider quotas',
    'Production real-token, quota and encrypted database verification remain unverified']
  }),
  Object.freeze({
   code:'SEC_EDGAR',name:'SEC EDGAR Public Submissions API',
   category:'public_corporate_filings',cost:'FREE_PUBLIC',
   credential:'NO_API_KEY_REQUIRED',
   terms:'https://www.sec.gov/about/webmaster-frequently-asked-questions',
   guide:'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
   retrieval:'HTTPS_JSON_WITH_DECLARED_USER_AGENT',
   localPipeline:'SAFE_CIK_SUBMISSIONS_QUARANTINE_ONLY',
   observedLiveCapture:'NOT_TESTED',
   commercialReuse:'GOVERNMENT_CONTENT_GENERALLY_REUSABLE_THIRD_PARTY_ATTACHMENTS_REVIEW',
   warnings:['Respect SEC total fair-access limit of 10 requests per second',
    'Declare real organization and contact in User-Agent',
    'EDGAR filings do not provide exchange trade or quote data']
  })
 ])
});