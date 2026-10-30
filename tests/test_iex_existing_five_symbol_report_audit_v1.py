"""Offline fixture coverage of prior IEX report audit; no real market data included."""
import copy, datetime as dt, sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"/"market-data"))
from audit_existing_iex_five_symbol_report_v1 import analyze,REQUIRED_SOURCE,SOURCE_BYTES

def fixture():
 start=dt.datetime(2026,9,21,13,30,tzinfo=dt.timezone.utc)
 bars=[{"timestamp_utc":(start+dt.timedelta(minutes=i)).isoformat().replace("+00:00","Z"),
  "open":"1.0000","high":"1.1000","low":"0.9000","close":"1.0500",
  "volume":100,"observed_trades":1,"last_sale_eligible_trades":1,
  "unreviewed_flags":{"0":1}} for i in range(30)]
 all_symbols={s:{"bar_count":len(bars),"first_window_trade_ids":30,
  "first_window_trade_ids_broken":0,"broken_trade_messages":0,
  "bars":copy.deepcopy(bars)} for s in ("BTTC","GRML","HUBC","MBRX","VRME")}
 return {"schema":"groundup.iex_full_day_reconciliation.v1",
  "date_et":"2026-09-21","source_sha256":REQUIRED_SOURCE,
  "source_bytes":SOURCE_BYTES,"member_publication_approved":False,
  "sequence_gaps_or_duplicates_require_review":False,"symbols":all_symbols}

class ExistingReportAudit(unittest.TestCase):
 def test_grml_complete_preliminary_only(self):
  d=analyze(fixture())
  self.assertTrue(d["preliminary_grml_candidate"])
  self.assertFalse(d["member_publication_approved"])
  self.assertTrue(d["requires_corrected_original_archive_reconciliation"])
  self.assertEqual(d["symbols"]["GRML"]["missing_price_candle_minutes"],[])
  self.assertEqual(d["symbols"]["GRML"]["volume_in_reported_price_candles"],3000)
 def test_diagnostic_gap_does_not_fabricate_price_minutes(self):
  f=fixture()
  item=f["symbols"]["MBRX"]
  item["first_window_trade_ids"]=32
  item["bars"]=item["bars"][:-1]
  r=analyze(f)["symbols"]["MBRX"]
  self.assertEqual(r["unique_ids_minus_price_candle_events_diagnostic_only"],3)
  self.assertEqual(len(r["missing_price_candle_minutes"]),1)
  self.assertTrue(r["report_schema_cannot_prove_unrepresented_volume_only_minutes"])
 def test_grml_missing_candle_rejected(self):
  f=fixture();f["symbols"]["GRML"]["bars"].pop()
  self.assertFalse(analyze(f)["preliminary_grml_candidate"])
 def test_hash_not_matched_rejected(self):
  f=fixture();f["source_sha256"]="0"*64
  with self.assertRaisesRegex(ValueError,"SHA"):
   analyze(f)
 def test_ohlc_invalid_blocks_candidate(self):
  f=fixture();f["symbols"]["GRML"]["bars"][0]["low"]="2.0000"
  self.assertFalse(analyze(f)["preliminary_grml_candidate"])

if __name__=="__main__":unittest.main()
