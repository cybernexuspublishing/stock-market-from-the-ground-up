/* Deployment 03 of 08 — authentic historical educational evidence gate.
 * Source title, arithmetic, a license blurb and fictional candles are NOT
 * historical source verification. Ingestion and public release are separate.
 */
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const SHA256=/^[a-f0-9]{64}$/i;
const SYMBOL=/^[A-Z][A-Z0-9.]{0,11}$/;
const ISO_DAY=/^\d{4}-\d{2}-\d{2}$/;
export function verifiedHistoricalDataset(d){
 if(!d||d.status!=='published'||d.dataset_type!=='ohlcv')return false;
 const m=d.metadata;
 if(!m||typeof m!=='object'||Array.isArray(m))return false;
 if(m.original_synthetic===true||m.real_market_security!==true||
  m.historical_evidence_verified!==true||m.evidence_verified!==true||
  m.licensed_for_member_display!==true||
  m.trading_conditions_reviewed!==true||m.packet_integrity_reviewed!==true||
  m.license_publication_reviewed!==true||m.corporate_actions_reviewed!==true)return false;
 if(!nonempty(d.source_attribution)||!nonempty(d.license_note)||
    !nonempty(m.corporate_action_policy)||!SHA256.test(String(m.source_sha256||''))||
    !nonempty(m.data_source)||!nonempty(m.venue_scope)||!nonempty(m.source_date)||
    !ISO_DAY.test(m.source_date)||!Number.isFinite(Date.parse(m.source_date+'T00:00:00Z'))||
    !nonempty(m.reviewed_by)||!nonempty(m.reviewed_at)||!Number.isFinite(Date.parse(m.reviewed_at))||
    !SYMBOL.test(String(d.ticker||'')))return false;
 // IEX reports ONLY IEX executions; not all-market volume/NBBO/depth.
 if(m.data_source==='IEX_HIST'&&m.venue_scope!=='IEX_SINGLE_VENUE')return false;
 return true;
}
export function replayAvailableToEntitlement(d,access){
 if(!verifiedHistoricalDataset(d))return false;
 return access==='MARKET_SIMULATOR'||access==='ONDEMAND_TRAINING'&&d.metadata?.ondemand_training_approved===true;
}

export function historicalQaReleasePermitted(dataset,userId){
 const flag=dataset?.metadata?.qa_release_only;
 if(flag===undefined||flag===false)return true;
 if(flag!==true)return false;
 const ids=dataset?.metadata?.qa_allowed_user_ids;
 return typeof userId==='string'&&Array.isArray(ids)&&ids.length>0&&ids.length<=3&&
  ids.every(x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))&&ids.includes(userId);
}
