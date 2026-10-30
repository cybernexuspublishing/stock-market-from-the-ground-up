"""Local IEX full-day reconciliation acceptance using synthetic PCAPNG fixtures only."""
import datetime as dt
import gzip
import hashlib
import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'/'market-data'))
sys.path.insert(0,str(ROOT/'tests'))
from iex_full_session_reconcile_v1 import full_review
from test_iex_historical_pcapng_reader_v1 import fake_capture

class LocalReconciliation(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory()
  self.addCleanup(self.temp.cleanup)
  self.file=Path(self.temp.name)/'data_feeds_20240507_20240507_IEXTP1_TOPS1.6.pcap.gz'
  shb,idb,epb=fake_capture()
  epb=bytearray(epb)
  # Test fixture's original timestamp is 10:30 ET, so set a real-window
  # 09:30 ET timestamp; update the IEX-TP protocol field as well.
  ip=8+20+14+20+8
  struct.pack_into('<H',epb,ip+2,0x8003)
  msg=ip+40+2
  timestamp=dt.datetime(2024,5,7,13,30,tzinfo=dt.timezone.utc)
  struct.pack_into('<q',epb,msg+2,int(timestamp.timestamp())*1_000_000_000)
  self.payload=shb+idb+epb
  self.file.write_bytes(gzip.compress(self.payload))
  self.size=self.file.stat().st_size
  self.sha=hashlib.sha256(self.file.read_bytes()).hexdigest()

 def test_local_reconciliation_no_market_publication(self):
  d=full_review('2024-05-07',['DIS'],self.sha,self.file,self.size)
  self.assertEqual(d['source_bytes'],self.size)
  self.assertEqual(d['source_sha256'],self.sha)
  self.assertEqual(d['source_filename'],self.file.name)
  self.assertEqual(d['source_acquisition'],'LOCAL_OWNER_ARCHIVE')
  self.assertTrue(d['local_archive_sha256_and_size_matched'])
  self.assertFalse(d['member_publication_approved'])
  self.assertEqual(d['symbols']['DIS']['bar_count'],1)
  self.assertEqual(d['symbols']['DIS']['bars'][0]['volume'],50)
  self.assertEqual(d['symbols']['DIS']['bars'][0]['open'],'106.5300')
  self.assertEqual(d['iextp_message_packets'],1)
  self.assertEqual(d['non_TOPS_packet_count'],0)

 def test_wrong_file_size_rejected(self):
  with self.assertRaisesRegex(ValueError,'byte count'):
   full_review('2024-05-07',['DIS'],self.sha,self.file,self.size+1)

 def test_wrong_sha_rejected(self):
  with self.assertRaisesRegex(ValueError,'SHA256'):
   full_review('2024-05-07',['DIS'],'0'*64,self.file,self.size)

 def test_mismatched_file_prefix_rejected(self):
  other=self.file.with_name('data_feeds_20240508_20240507_IEXTP1_TOPS1.6.pcap.gz')
  self.file.rename(other)
  with self.assertRaisesRegex(ValueError,'filename'):
   full_review('2024-05-07',['DIS'],self.sha,other,self.size)

 def test_no_remote_call_for_local(self):
  import unittest.mock as mock
  with mock.patch('iex_full_session_reconcile_v1.official_link',side_effect=AssertionError('No network call permitted')):
   d=full_review('2024-05-07',['DIS'],self.sha,self.file,self.size)
   self.assertEqual(d['source_acquisition'],'LOCAL_OWNER_ARCHIVE')

if __name__=='__main__':unittest.main()
