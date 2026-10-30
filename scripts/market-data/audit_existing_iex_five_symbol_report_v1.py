#!/usr/bin/env python3
"""Offline preliminary audit of prior owner IEX review JSON; NO raw prices exported.

No archive rescan, no network and no website/database publication. The original
old extractor can omit volume-only minutes, so a discrepancy remains a hard
prepublication hold until the corrected full-source reconcilation is performed.
"""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
from decimal import Decimal, InvalidOperation

REQUIRED_SOURCE="01d84281611cb7df8523f5ba2ea77db8b61af5aefcd7c420e142dde792b4008b"
SOURCE_BYTES=10282646165
TARGETS=("BTTC","GRML","HUBC","MBRX","VRME")

def analyze(d):
 if d.get("schema")!="groundup.iex_full_day_reconciliation.v1":
  raise ValueError("Not a full-day original-source reconciliation")
 if d.get("date_et")!="2026-09-21" or d.get("source_sha256","").lower()!=REQUIRED_SOURCE or d.get("source_bytes")!=SOURCE_BYTES:
  raise ValueError("Trading date or source SHA-256 / exact bytes mismatch")
 if d.get("member_publication_approved") is not False:
  raise ValueError("Unexpected publication flag")
 start=dt.datetime(2026,9,21,13,30,tzinfo=dt.timezone.utc)
 allowed=[(start+dt.timedelta(minutes=i)).isoformat().replace("+00:00","Z") for i in range(30)]
 summary={}
 for sym in TARGETS:
  item=d.get("symbols",{}).get(sym)
  if not isinstance(item,dict):raise ValueError("Missing selected ticker "+sym)
  bars=item.get("bars")
  if not isinstance(bars,list):raise ValueError("Missing source candle list "+sym)
  valid=True;actual=[];sum_volume=0;sum_events=0;sum_eligible=0
  flags_by_value={}
  for b in bars:
   stamp=b.get("timestamp_utc","")
   actual.append(stamp)
   if stamp not in allowed:valid=False
   try:
    o,h,l,c=[Decimal(str(b[k])) for k in ("open","high","low","close")]
    if not (0<l<=min(o,c)<=max(o,c)<=h):valid=False
    if any(v.as_tuple().exponent < -4 for v in (o,h,l,c)):valid=False
   except (InvalidOperation,KeyError,TypeError,ValueError):valid=False
   v=b.get("volume");n=b.get("observed_trades");eligible=b.get("last_sale_eligible_trades")
   if not isinstance(v,int) or v<0 or not isinstance(n,int) or n<1 or not isinstance(eligible,int) or not 1<=eligible<=n:
    valid=False
   else:
    sum_volume+=v;sum_events+=n;sum_eligible+=eligible
   flags=b.get("unreviewed_flags")
   if not isinstance(flags,dict):valid=False
   else:
    if sum(flags.values())!=n:valid=False
    for k,count in flags.items():flags_by_value[k]=flags_by_value.get(k,0)+count
  if actual!=sorted(set(actual)):valid=False
  count=len(bars)
  first_ids=item.get("first_window_trade_ids")
  breaks=item.get("first_window_trade_ids_broken")
  breakout=item.get("broken_trade_messages")
  count_comparable=isinstance(first_ids,int) and isinstance(breaks,int) and breaks==0
  discrepancy=(first_ids-sum_events) if count_comparable else None
  full_window=count==30 and actual==allowed
  summary[sym]={
   "reported_price_candles":count,
   "full_0930_1000_price_window":full_window,
   "price_candle_timestamp_ohlcv_integrity":valid,
   "first_window_unique_trade_ids":first_ids,
   "observed_trade_events_in_reported_price_candles":sum_events,
   "unique_ids_minus_price_candle_events_diagnostic_only":discrepancy,
   "last_sale_eligible_trades_in_reported_candles":sum_eligible,
   "volume_in_reported_price_candles":sum_volume,
   "flag_counts_in_reported_price_candles":flags_by_value,
   "recorded_trade_break_messages":breakout,
   "missing_price_candle_minutes":list(sorted(set(allowed)-set(actual))),
   "report_schema_cannot_prove_unrepresented_volume_only_minutes":True,
   "publication_approved":False}
 grml=summary["GRML"]
 grml["preliminary_pilot_pass"]=(grml["full_0930_1000_price_window"] and
    grml["price_candle_timestamp_ohlcv_integrity"] and
    grml["unique_ids_minus_price_candle_events_diagnostic_only"]==0 and
    grml["recorded_trade_break_messages"]==0 and
    not d.get("sequence_gaps_or_duplicates_require_review",True))
 return {"schema":"groundup.iex_preliminary_existing_report_audit.v1",
   "source_sha256":REQUIRED_SOURCE,
   "source_bytes":SOURCE_BYTES,
   "date_et":"2026-09-21",
   "preliminary_grml_candidate":grml["preliminary_pilot_pass"],
   "member_publication_approved":False,
   "independent_source_validation":False,
   "raw_market_prices_exported":False,
   "requires_corrected_original_archive_reconciliation":True,
   "venue_scope":"IEX_ONLY_NOT_SIP",
   "symbols":summary}

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--input",required=True,type=Path)
 p.add_argument("--output",required=True,type=Path)
 a=p.parse_args()
 if a.input.resolve()==a.output.resolve():p.error("Refuse to overwrite original input")
 if any(part.lower() in ("assets","public","functions","docs") for part in a.output.parts):
  p.error("Output must remain in a private directory")
 try:
  doc=json.loads(a.input.read_text(encoding="utf-8"))
  result=analyze(doc)
  a.output.parent.mkdir(parents=True,exist_ok=True)
  a.output.write_text(json.dumps(result,indent=2,sort_keys=True)+"\n",encoding="utf-8")
  print(json.dumps({"grml_preliminary_candidate":result["preliminary_grml_candidate"],
   "checks":{k:{"bar_count":v["reported_price_candles"],
    "price_minutes_complete":v["full_0930_1000_price_window"],
    "unique_ids_minus_observed_events":v["unique_ids_minus_price_candle_events_diagnostic_only"]}
    for k,v in result["symbols"].items()},
   "release":"HOLD_UNTIL_ORIGINAL_RECONCILIATION_AND_RIGHTS_REVIEW"}))
 except (OSError,ValueError,KeyError,TypeError) as e:
  p.exit(2,"Source review rejected: "+str(e)+"\n")

if __name__=="__main__":
 main()
