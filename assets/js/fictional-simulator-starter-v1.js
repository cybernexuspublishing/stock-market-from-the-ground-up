/* Free Market Simulator Starter v1.
 * Entire sequence is fabricated and visible to browser devtools.
 * NEVER use these client-side candles as historical market data, blind
 * assessment evidence, verified fills, or official member mastery.
 */
(function(root){
 'use strict';
 const closeCents=[1000,1007,1015,1010,1003,1009,1021,1026,1016,1009,
  1001,996,1005,1014,1024,1019,1011,1000,991,1001,
  1012,1018,1029,1023,1034,1043,1035,1024,1031,1040,
  1049,1041,1033,1044,1051,1046];
 const upper=[6,4,9,6,8,7,4,10,6,7,5,9];
 const lower=[5,7,4,8,5,6,9,4,7,5,8,6];
 const note='ORIGINAL FICTIONAL PRACTICE — fabricated 2040 timestamps and hypothetical prices. Not actual market history, brokerage fills, a blind replay, or an official grade.';
 function generate(){
  const start=Date.parse('2040-02-06T14:30:00Z');
  return closeCents.map((close,i)=>{
   const open=i?closeCents[i-1]:1000;
   return {
    time:new Date(start+i*5*60*1000),
    open:open/100,high:(Math.max(open,close)+upper[i%upper.length])/100,
    low:(Math.min(open,close)-lower[i%lower.length])/100,close:close/100,
    volume:Math.round(24000+i*1900+(i%7)*5100)
   };
  });
 }
 root.GroundUpFictionalSimulatorStarterV1=Object.freeze({
  source:'ORIGINAL FICTIONAL STARTER (2040)',symbol:'GUSIM',note,generate
 });
})(globalThis);
