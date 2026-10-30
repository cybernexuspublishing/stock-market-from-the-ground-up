#!/usr/bin/env python3
"""Prepare PRIVATE DRAFT-only Supabase SQL for IEX-verified replay source.

Consumes private, full-day reconciled JSON evidence; writes nothing to Supabase.
Never upgrades publication status, entitlements, or licensing flags. Does not
copy vendor bars into public GitHub outputs. Owner controls final execution.
"""
import argparse,datetime as dt,hashlib,json,pathlib,re
from decimal import Decimal
from zoneinfo import ZoneInfo

CODE=re.compile(r'^HR_([A-Z][A-Z0-9.]*)_(20\d{6})$')
SHA=re.compile(r'^[a-f0-9]{64}$')
def prepare(doc,code):
 m=CODE.fullmatch(code)
 if not m:raise ValueError('Unrecognized draft historical code')
 symbol,ymd=m.groups();day=dt.datetime.strptime(ymd,'%Y%m%d').strftime('%Y-%m-%d')
 if doc.get('schema')!='groundup.iex_full_day_reconciliation.v1' or doc.get('date_et')!=day:
  raise ValueError('Full-day authentic evidence required for exact trading date')
 if doc.get('member_publication_approved') is not False:
  raise ValueError('Importer must not accept any self-approved source claims')
 if not SHA.fullmatch(str(doc.get('source_sha256',''))):
  raise ValueError('Missing original capture hash')
 if doc.get('sequence_gaps_or_duplicates_require_review') is not False or doc.get('non_TOPS_packet_count')!=0:
  raise ValueError('Packet-sequence or protocol integrity requires manual review')
 v=doc.get('symbols',{}).get(symbol)
 if not isinstance(v,dict) or not isinstance(v.get('bars'),list):
  raise ValueError('Symbol is not present in verified original capture')
 rows=v['bars']
 audit=v.get('volume_conservation')
 if not isinstance(audit,dict) or audit.get('passed') is not True:
  raise ValueError('Updated full-day event and volume conservation evidence is required')
 if v.get('volume_only_minutes'):
  raise ValueError('Volume-only minutes require a separately reviewed representation; do not discard their shares')
 if audit.get('volume_only_volume')!=0 or audit.get('volume_only_events')!=0:
  raise ValueError('Unrepresented venue-only volume or trade events require review')
 if audit.get('price_bar_volume')!=sum(b.get('volume',0) for b in rows):
  raise ValueError('Bar-volume total does not match source venue-volume audit')
 if audit.get('price_bar_events')!=sum(b.get('observed_trades',0) for b in rows):
  raise ValueError('Price-bar trade events do not match source audit')
 if audit.get('all_venue_volume')!=audit.get('price_bar_volume'):
  raise ValueError('Total venue volume cannot be represented by the available OHLCV bars')
 if len(rows)<2 or len(rows)>60:raise ValueError('No bounded source interval')
 normalized=[]
 prev=None
 for i,b in enumerate(rows):
  when=dt.datetime.fromisoformat(b['timestamp_utc'].replace('Z','+00:00'))
  local=when.astimezone(ZoneInfo('America/New_York'))
  if local.date().isoformat()!=day or not dt.time(9,30)<=local.time()<dt.time(10,0) or when.second or when.microsecond:
   raise ValueError('Source interval or timezone mismatch')
  if prev and when<=prev:raise ValueError('Non-increasing source candles')
  prev=when
  o,h,l,c=(Decimal(str(b[k])) for k in ('open','high','low','close'))
  if min(o,h,l,c)<=0 or h<max(o,c) or l>min(o,c) or l>h:
   raise ValueError('OHLC validity failed')
  if any(x.as_tuple().exponent < -4 for x in (o,h,l,c)):raise ValueError('Price has greater-than-source precision')
  volume=b['volume']
  if not isinstance(volume,int) or volume<0:raise ValueError('Invalid source venue-only volume')
  normalized.append((i,b['timestamp_utc'],str(o),str(h),str(l),str(c),volume))
 def sqlquote(value):return "'"+str(value).replace("'","''")+"'"
 values=',\n'.join('('+','.join([sqlquote(code),str(i),sqlquote(ts),o,h,l,c,str(vol)])+')' for i,ts,o,h,l,c,vol in normalized)
 sig=hashlib.sha256(json.dumps(normalized,sort_keys=True,separators=(',',':')).encode()).hexdigest()
 sql=f"""BEGIN;
DO $check$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.market_datasets
 WHERE dataset_code={sqlquote(code)} AND ticker={sqlquote(symbol)}
 AND status='draft' AND metadata->>'source_date'={sqlquote(day)}
 AND metadata->>'licensed_for_member_display'='false') THEN
 RAISE EXCEPTION 'Dataset is not a private, owner-reviewed, unlicensed draft';
 END IF;
 IF EXISTS (SELECT 1 FROM public.gu_replay_bars_v01492 WHERE dataset_code={sqlquote(code)}) THEN
 RAISE EXCEPTION 'Existing bars require independent reconciliation; never silently overwrite';
 END IF;
END $check$;
INSERT INTO public.gu_replay_bars_v01492(dataset_code,bar_index,bar_at,open,high,low,close,volume)
VALUES
{values};
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.gu_replay_bars_v01492 WHERE dataset_code={sqlquote(code)}) <> {len(normalized)} THEN
 RAISE EXCEPTION 'Bar count mismatch; transaction will roll back';
 END IF;
END $post$;
COMMIT;
"""
 return sql,{'dataset_code':code,'source_sha256':doc['source_sha256'],'source_reconciled_bars':len(normalized),'bar_rows_sha256':sig,
             'release':'DRAFT_ONLY','licensed_for_member_display':False,'owner_publication_approved':False}
def main():
 p=argparse.ArgumentParser();p.add_argument('--input',type=pathlib.Path,required=True);p.add_argument('--code',required=True);p.add_argument('--output-dir',type=pathlib.Path,required=True)
 a=p.parse_args()
 if any(s.lower() in ('public','assets','docs','functions','data') for s in a.output_dir.parts):raise SystemExit('Must use a secure, non-web private directory')
 if a.output_dir.exists() and any(a.output_dir.iterdir()):raise SystemExit('Refuse to overwrite nonempty private draft directory')
 sql,receipt=prepare(json.loads(a.input.read_text()),a.code)
 a.output_dir.mkdir(parents=True,exist_ok=True)
 (a.output_dir/'draft_source_insert.sql').write_text(sql)
 (a.output_dir/'draft_import_manifest.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
 print(json.dumps(receipt,sort_keys=True))
if __name__=='__main__':main()
