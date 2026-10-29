import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts/market-data'))
from iex_historical_archive_probe import accumulate_trade
class Eligibility(unittest.TestCase):
 def test_odd_lot_contributes_volume_but_not_ohlc(self):
  r={'open':None,'high':None,'low':None,'close':None,'volume':0,'observed_trades':0,'last_sale_eligible_trades':0,'unreviewed_flags':{}}
  accumulate_trade(r,1056700,6,0x20)
  self.assertIsNone(r['open'])
  accumulate_trade(r,1072500,100,0)
  accumulate_trade(r,1065300,20,0x80)
  self.assertEqual([r[k] for k in ('open','high','low','close')],[1072500,1072500,1065300,1065300])
  self.assertEqual(r['volume'],126)
  self.assertEqual(r['last_sale_eligible_trades'],2)
 def test_extended_and_odd_only_minute_has_no_price_bar(self):
  r={'open':None,'high':None,'low':None,'close':None,'volume':0,'observed_trades':0,'last_sale_eligible_trades':0,'unreviewed_flags':{}}
  accumulate_trade(r,1219900,1,0x20)
  accumulate_trade(r,1220000,2,0x40)
  self.assertIsNone(r['open'])
  self.assertEqual(r['volume'],3)
if __name__=='__main__':unittest.main()
