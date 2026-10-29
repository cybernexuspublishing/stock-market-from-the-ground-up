"""Synthetic fixtures verify a converter, never demonstrate actual market history."""
import importlib.util
from pathlib import Path
import json
import tempfile
import unittest

MODULE=Path(__file__).resolve().parents[1]/'scripts/market-data/prepare_replay_import.py'
spec=importlib.util.spec_from_file_location('prepare_replay_import',MODULE)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def source():
    return dict(schema='groundup.iex_tops.bars.v1',status='quarantined_pending_owner_review',
        eligible_for_member_release=False,source='IEX_HIST',feed='TOPS_1.6',exchange='IEX',
        market_scope='SINGLE_EXCHANGE_IEX_ONLY_NOT_SIP_NOT_NBBO',symbol='AAPL',
        trading_date_ny='2026-10-07',interval_seconds=60,
        provenance={'source_sha256':'c'*64,
          'source_file':'20261007_IEXTP1_TOPS1.6.pcap.gz',
          'terms_url':'https://www.iex.io/legal/hist-data-terms'},
        counts={'bar_count':2},bars=[
          dict(index=0,timestamp_utc='2026-10-07T13:30:00Z',open='100.0000',
            high='100.0100',low='99.9900',close='100.0100',volume=19),
          dict(index=1,timestamp_utc='2026-10-07T13:31:00Z',open='100.0100',
            high='100.0200',low='99.9800',close='99.9900',volume=48)
        ])


class ImporterAcceptance(unittest.TestCase):
    def test_draft_matches_existing_schema_and_never_auto_approves(self):
        d,bars,review=m.validate_and_prepare(source(),'IEX_AAPL_20261007')
        self.assertEqual(d['status'],'draft')
        self.assertIn('By accessing or using IEX Historical Data',d['source_attribution'])
        self.assertIn('https://www.iex.io/legal/hist-data-terms',d['source_attribution'])
        self.assertEqual(len(bars),2)
        self.assertEqual([r['bar_index'] for r in bars],[0,1])
        self.assertEqual(bars[1]['volume'],48)
        mdata=json.loads(d['metadata'])
        for flag in ('historical_evidence_verified','evidence_verified','licensed_for_member_display',
                     'trading_conditions_reviewed','packet_integrity_reviewed','corporate_actions_reviewed',
                     'license_publication_reviewed','ondemand_training_approved'):
            self.assertIs(mdata[flag],False,flag)
        self.assertEqual(mdata['venue_scope'],'IEX_SINGLE_VENUE')
        self.assertEqual(review['status'],'NOT_APPROVED_FOR_MEMBER_OR_LAB_DISPLAY')
    def test_invalid_market_bar_rejected(self):
        for key,value in [('high','99.0000'),('volume',-1),('open','0.0000'),
                          ('close','NaN'),('timestamp_utc','2026-10-07T20:00:00Z')]:
            d=source();d['bars'][0][key]=value
            with self.subTest(key=key), self.assertRaises(ValueError):
                m.validate_and_prepare(d,'IEX_AAPL_20261007')
    def test_source_mismatch_rejected(self):
        for key,value in [('market_scope','SIP_CONSOLIDATED'),
                          ('source','Other_Source'),('status','published')]:
            d=source();d[key]=value
            with self.subTest(key=key), self.assertRaises(ValueError):
                m.validate_and_prepare(d,'IEX_AAPL_20261007')
    def test_noncontiguous_or_reversed_rejected(self):
        d=source();d['bars'][1]['index']=2
        with self.assertRaises(ValueError):
            m.validate_and_prepare(d,'IEX_AAPL_20261007')
        d=source();d['bars'][1]['timestamp_utc']=d['bars'][0]['timestamp_utc']
        with self.assertRaises(ValueError):
            m.validate_and_prepare(d,'IEX_AAPL_20261007')
    def test_cli_does_not_write_outside_private_folder(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td)/'input.json';path.write_text(json.dumps(source()))
            out=Path(td)/'review'
            m.main(['--input',str(path),'--dataset-code','IEX_AAPL_20261007','--out-dir',str(out)])
            self.assertTrue((out/'market_datasets_DRAFT.csv').exists())
            self.assertTrue((out/'gu_replay_bars_v01492_DRAFT.csv').exists())
            self.assertTrue((out/'owner_review_REQUIRED.json').exists())
            with self.assertRaises(SystemExit) as ctx:
                m.main(['--input',str(path),'--dataset-code','IEX_AAPL_20261007','--out-dir',str(out)])
            self.assertEqual(ctx.exception.code,2)
            with self.assertRaises(SystemExit):
                m.main(['--input',str(path),'--dataset-code','IEX_AAPL_20261007',
                       '--out-dir','public/export'])


if __name__=='__main__':
    unittest.main()
