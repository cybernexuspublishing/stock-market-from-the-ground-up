"""Synthetic transport FIXTURES used only for parser QA, never lessons."""
import datetime as dt
import gzip
import io
from pathlib import Path
import struct
import tempfile
import unittest
import importlib.util

ROOT=Path(__file__).resolve().parents[1]
def module(name,rel):
    sp=importlib.util.spec_from_file_location(name,ROOT/rel)
    m=importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m
iex=module('iex_tops','scripts/market-data/iex_tops.py')
sec=module('sec_edgar','scripts/market-data/sec_edgar.py')


def frame(ts,px,size=10,symbol=b'AAPL'):
    # Synthetic protocol envelope: tests decode/rounding, NOT a historical trade.
    msg=struct.pack('<BBq8sIqq',ord('T'),0,ts,symbol.ljust(8,b' '),size,px,77)
    payload=struct.pack('<H',len(msg))+msg
    header=struct.pack('<BBHIIHHQQQ',1,0,0x8004,1,1,len(payload),1,0,1,0)
    ip=bytes([0x45,0,0,20+8+len(header)+len(payload)])+b'\x00'*4+b'\x40\x11'+b'\x00'*2+b'\x7f\x00\x00\x01'*2
    udp=struct.pack('!HHHH',3333,5555,8+len(header)+len(payload),0)
    data=b'\x00'*12+b'\x08\x00'+ip+udp+header+payload
    return struct.pack('<IIII',0,0,len(data),len(data))+data


def pcap(*frames):
    return struct.pack('<IHHIIII',0xa1b2c3d4,2,4,0,0,65535,1)+b''.join(frames)


class TestMarketIngest(unittest.TestCase):
    def test_iex_stream_gzip_timestamp_volume_and_ohlc(self):
        ts=int(dt.datetime(2026,10,7,13,30,tzinfo=dt.timezone.utc).timestamp()*1e9)
        with tempfile.TemporaryDirectory() as td:
            file=Path(td)/'20261007_IEXTP1_TOPS1.6.pcap.gz'
            with gzip.open(file,'wb') as f:
                # Data arrives out of timestamp order; output should sort.
                f.write(pcap(frame(ts+20_000_000_000,1_000_000,3),
                             frame(ts,999_900,5),frame(ts+35_000_000_000,1_000_100,2)))
            result=iex.bar_export(file,'AAPL','2026-10-07',60)
            assert result['counts']['selected_venue_trades']==3
            assert result['eligible_for_member_release'] is False
            assert result['status']=='quarantined_pending_owner_review'
            bar=result['bars'][0]
            assert (bar['open'],bar['high'],bar['low'],bar['close'])==('99.9900','100.0100','99.9900','100.0100')
            assert bar['volume']==10
            assert len(result['provenance']['source_sha256'])==64
            assert 'NOT_SIP' in result['market_scope']
            assert result['requires_trade_condition_review'] and result['requires_packet_gap_review']
    def test_short_capture_rejected(self):
        with self.assertRaises(iex.CaptureError):
            list(iex.stream_pcap(io.BytesIO(pcap(frame(1,100))[:-4])))
    def test_message_length_rejected(self):
        data=struct.pack('<BBHIIHHQQQ',1,0,0,1,1,900,1,0,1,0)+b'\x00'
        with self.assertRaises(iex.CaptureError):
            list(iex.trades_from_payload(data))
    def test_wrong_day_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            f=Path(td)/'20261007_IEXTP1_TOPS1.6.pcap'
            f.write_bytes(pcap(frame(1,100)))
            with self.assertRaises(iex.CaptureError):
                iex.bar_export(f,'AAPL','2026-10-08',60)
    def test_wrong_capture_type_rejected(self):
        with self.assertRaises(iex.CaptureError):
            list(iex.stream_pcap(io.BytesIO(b'broken')))
    def test_avoid_public_file_output(self):
        with self.assertRaises(SystemExit) as thrown:
            iex.main(['--file','20261007_IEXTP1_TOPS1.6.pcap','--symbol','AAPL',
                      '--date','2026-10-07','--output','public/lesson.json'])
        self.assertEqual(thrown.exception.code,2)
    def test_sec_no_live_network_and_safe_cik(self):
        class Mock:
            def __enter__(self):return self
            def __exit__(self,*a):pass
            def read(self,n):return b'{"cik":320193,"filings":{"recent":{"form":["10-K"]}}}'
        def fetch(req,timeout):
            assert req.full_url=='https://data.sec.gov/submissions/CIK0000320193.json'
            assert 'Publisher' in req.headers['User-agent']
            return Mock()
        obj=sec.get_submissions('320193','Publisher Company contact@example.com',fetch)
        assert obj['api_key_required'] is False
        assert obj['data']['cik']==320193
        assert obj['eligible_for_member_release'] is False
    def test_sec_invalid_inputs_rejected(self):
        for cik,ua in [('https://evil.example','Company contact@example.com'),
                        ('0','Company contact@example.com'),('320193','Missing contact')]:
            with self.assertRaises(ValueError):sec.get_submissions(cik,ua)


if __name__=='__main__':
    unittest.main()
