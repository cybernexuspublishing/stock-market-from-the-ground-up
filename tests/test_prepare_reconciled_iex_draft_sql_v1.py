import copy,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts/market-data'))
from prepare_reconciled_iex_draft_sql_v1 import prepare
def source():
 return {'schema':'groundup.iex_full_day_reconciliation.v1','date_et':'2024-05-07','source_sha256':'a'*64,
 'member_publication_approved':False,'non_TOPS_packet_count':0,'sequence_gaps_or_duplicates_require_review':False,
 'symbols':{'DIS':{'bars':[{'timestamp_utc':'2024-05-07T13:30:00Z','open':'107.2500','high':'107.2500','low':'105.7650','close':'106.5300','volume':32051},
 {'timestamp_utc':'2024-05-07T13:31:00Z','open':'106.5300','high':'107.0550','low':'106.4600','close':'107.0550','volume':22673}]}}}
class DraftImport(unittest.TestCase):
 def test_private_draft_source_is_never_published(self):
  sql,m=prepare(source(),'HR_DIS_20240507')
  self.assertEqual(m['release'],'DRAFT_ONLY')
  self.assertFalse(m['owner_publication_approved'])
  self.assertFalse(m['licensed_for_member_display'])
  self.assertIn("status='draft'",sql)
  self.assertIn("metadata->>'licensed_for_member_display'='false'",sql)
  self.assertNotIn('status=\\'published\\'',sql)
  self.assertIn('COMMIT;',sql)
  self.assertEqual(m['source_reconciled_bars'],2)
 def test_rejects_unapproved_source_and_bad_data(self):
  for key,val in [('member_publication_approved',True),('non_TOPS_packet_count',1),('sequence_gaps_or_duplicates_require_review',True),('source_sha256','garbage')]:
   src=source();src[key]=val
   with self.assertRaises(ValueError,msg=key):prepare(src,'HR_DIS_20240507')
  src=source();src['symbols']['DIS']['bars'][0]['low']='108.0000'
  with self.assertRaises(ValueError):prepare(src,'HR_DIS_20240507')
 def test_wrong_source_day_rejected(self):
  with self.assertRaises(ValueError):prepare(source(),'HR_DIS_20240508')
if __name__=='__main__':unittest.main()
