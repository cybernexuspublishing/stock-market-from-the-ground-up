"""Synthetic archive unit tests; do not mistake them for live IEX provenance."""
import gzip
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

SRC=Path(__file__).resolve().parents[1]/"scripts/market-data/verify_local_iex_archive_v1.py"
spec=importlib.util.spec_from_file_location("iex_local_verifier",SRC)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class IEXLocalVerifier(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path=Path(self.tmp.name)/"data_feeds_20260921_20260921_IEXTP1_TOPS1.6.pcap.gz"
        self.payload=b"\x0a\x0d\x0d\x0a"+(b"test synthetic pcapng header content"*3000)
        self.path.write_bytes(gzip.compress(self.payload))
        self.hash=hashlib.sha256(self.path.read_bytes()).hexdigest()

    def test_accepted_prefixed_archive_with_full_crc(self):
        data=mod.verify(self.path,"2026-09-21",self.hash,self.path.stat().st_size)
        self.assertTrue(data["full_gzip_stream_crc_checked"])
        self.assertEqual(data["capture_format"],"PCAPNG")
        self.assertEqual(data["compressed_sha256"],self.hash)
        self.assertEqual(data["decompressed_bytes_streamed"],len(self.payload))
        self.assertFalse(data["member_publication_approved"])
        self.assertFalse(data["licensed_for_member_display"])

    def test_canonical_archive_without_prefix(self):
        other=self.path.with_name("20260921_IEXTP1_TOPS1.6.pcap.gz")
        self.path.rename(other)
        self.assertTrue(mod.verify(other,"2026-09-21",self.hash)["expected_sha256_matched"])

    def test_reject_mismatched_prefix_date(self):
        bad=self.path.with_name("data_feeds_20260922_20260921_IEXTP1_TOPS1.6.pcap.gz")
        self.path.rename(bad)
        with self.assertRaisesRegex(mod.IntegrityError,"filename"):
            mod.verify(bad,"2026-09-21",self.hash)

    def test_reject_wrong_official_size(self):
        with self.assertRaisesRegex(mod.IntegrityError,"byte count"):
            mod.verify(self.path,"2026-09-21",self.hash,123)

    def test_reject_wrong_fingerprint(self):
        with self.assertRaisesRegex(mod.IntegrityError,"SHA-256"):
            mod.verify(self.path,"2026-09-21","0"*64)

    def test_reject_truncated_gzip(self):
        data=self.path.read_bytes()
        self.path.write_bytes(data[:-8])
        actual=hashlib.sha256(self.path.read_bytes()).hexdigest()
        with self.assertRaisesRegex(mod.IntegrityError,"Incomplete or corrupt"):
            mod.verify(self.path,"2026-09-21",actual)

if __name__=="__main__":
    unittest.main()
