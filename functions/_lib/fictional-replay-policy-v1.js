/* Free fictional replay policy. No real market data, brokerage executions or grades.
 * Distinct from verifiedHistoricalDataset(): never relax that function.
 * Decisions and forward progress reuse gu_replay_sessions_v01492 and v01492_replay_advance.
 */
export function fictionalReplayPermitted(d) {
 const m=d?.metadata;
 return !!(d && d.status==='published' && d.dataset_type==='ohlcv' &&
  typeof d.dataset_code==='string' && /^GUSIM_[A-Z0-9_]{3,74}$/.test(d.dataset_code) &&
  m?.original_synthetic===true && m?.real_market_security===false &&
  m?.historical_evidence_verified===false && m?.licensed_for_member_display===true &&
  m?.educational_only===true && m?.invented_timestamp_year===2040 &&
  typeof d.source_attribution==='string' && /fictional|computer-created/i.test(d.source_attribution) &&
  typeof d.license_note==='string' && d.license_note.length>=8);
}
export const FICTIONAL_REPLAY_DISCLOSURE=
 'ORIGINAL FICTIONAL EDUCATIONAL SCENARIO — invented 2040 prices and timestamps, not authentic market history. No real orders, broker fills, future-bar access, official grading or mastery.';
