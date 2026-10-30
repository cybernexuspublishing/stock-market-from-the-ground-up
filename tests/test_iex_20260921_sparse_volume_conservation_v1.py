"""Synthetic-only checks for conservation of IEX volume, trade IDs and sparse windows."""
import datetime as dt
import struct
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'/'market-data'))
from iex_full_session_reconcile_v1 import reconcile_window
from pcapng_iex_reader import filtered_trades

UTC=dt.timezone.utc
START=dt.datetime(2026,9,21,13,30,tzinfo=UTC)
END=START+dt.timedelta(minutes=30)
def event(minute,ident,volume,flags=0,price=1234500):
    nanos=int((START+dt.timedelta(minutes=minute)).timestamp())*1_000_000_000
    return ident,(nanos,ident,price,volume,flags)

class SourceTradeConservation(unittest.TestCase):
    def test_preserves_volume_only_minutes_without_lookahead_or_fake_candles(self):
        ids=dict([event(0,101,100),event(1,102,20,0x20),
                  event(1,103,30,0x40),event(2,104,200),
                  event(2,105,5,0x20),event(3,106,75)])
        result=reconcile_window({i:[v] for i,v in ids.items()},{106},START,END)
        self.assertEqual(result['bar_count'],2)
        self.assertEqual(result['opening_trade_events_before_breaks'],6)
        self.assertEqual(result['opening_trade_events_removed_by_breaks'],1)
        self.assertEqual(result['opening_live_trade_events'],5)
        self.assertEqual(result['opening_venue_volume_shares'],355)
        self.assertEqual(result['volume_conservation']['price_bar_volume'],305)
        self.assertEqual(result['volume_conservation']['volume_only_volume'],50)
        self.assertTrue(result['volume_conservation']['passed'])
        self.assertEqual(result['price_candle_event_count'],3)
        self.assertEqual(result['volume_only_event_count'],2)
        self.assertEqual(len(result['volume_only_minutes']),1)
        self.assertEqual(result['volume_only_minutes'][0]['volume'],50)
        self.assertEqual(result['volume_only_minutes'][0]['observed_trades'],2)
        self.assertEqual(len(result['no_venue_trade_minutes']),27)
        self.assertEqual(result['bars'][0]['volume'],100)
        self.assertEqual(result['bars'][1]['volume'],205)
        self.assertTrue(result['no_imputed_candles'])

    def test_full_thirty_minute_price_window_stays_contiguous(self):
        ids={i:[event(i,i,100+i)[1]] for i in range(30)}
        result=reconcile_window(ids,set(),START,END)
        self.assertEqual(result['bar_count'],30)
        self.assertEqual(result['volume_only_minutes'],[])
        self.assertEqual(result['no_venue_trade_minutes'],[])
        self.assertEqual(result['opening_live_trade_events'],30)
        self.assertEqual(result['opening_venue_volume_shares'],sum(100+i for i in range(30)))
        self.assertTrue(result['volume_conservation']['passed'])

    def test_null_padded_security_name_is_accepted(self):
        body=bytearray(38)
        body[0]=0x54
        struct.pack_into('<q',body,2,int(START.timestamp())*1_000_000_000)
        body[10:18]=b'GRML\x00\x00\x00\x00'
        struct.pack_into('<I',body,18,100)
        struct.pack_into('<q',body,22,1245000)
        struct.pack_into('<q',body,30,42)
        message=struct.pack('<H',len(body))+body
        wire=bytearray(40)+message
        wire[0]=1
        struct.pack_into('<HH',wire,12,len(message),1)
        rows=list(filtered_trades(bytes(wire),{'GRML'},include_breaks=True))
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0][1],'GRML')
        self.assertEqual(rows[0][-1],'T')

if __name__=='__main__':
    unittest.main()
