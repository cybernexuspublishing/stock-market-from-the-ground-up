#!/usr/bin/env python3
"""Full-day authenticated IEX TOPS trade and break reconciliation, QUARANTINE ONLY.

Verifies complete original gzip bytes against independently obtained SHA256.
Audits IEX-TP per-session sequence continuity and corrects broken early trades.
Produces only a private JSON review artifact, never website-published bars.
"""
import argparse,datetime as dt,gzip,hashlib,json,struct,urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
from iex_historical_archive_probe import official_link, LimitedStream, accumulate_trade
from iex_tops import NAME
from pcapng_iex_reader import stream_pcapng

TZ=ZoneInfo('America/New_York')
UTC=dt.timezone.utc
def full_review(day,symbols,expected_sha,local_file=None,expected_bytes=None):
 # Local mode uses the owner's immutable, full-CRC-verified archive without network access.
 # Remote mode preserves the existing bounded official-source behavior.
 if local_file is None:
  url,size,name=official_link(day)
  if size>3000*1048576:raise ValueError('Source exceeds fixed one-time budget')
 else:
  local_file=Path(local_file)
  match=NAME.fullmatch(local_file.name)
  expected_date=day.replace('-','')
  if not match or match.group('source_date')!=expected_date or (match.group('prefix_date') and match.group('prefix_date')!=expected_date):
   raise ValueError('Local archive must have the correct original IEX TOPS filename and matching date')
  if not local_file.is_file():raise ValueError('Selected original archive does not exist')
  size=local_file.stat().st_size
  if expected_bytes is None or expected_bytes!=size:raise ValueError('Local original archive byte count does not match verified catalog size')
  url=None
  name=local_file.name
 start=dt.datetime.combine(dt.date.fromisoformat(day),dt.time(9,30),TZ).astimezone(UTC)
 end=start+dt.timedelta(minutes=30)
 full_hash=hashlib.sha256()
 class Tracking:
  total=0
  def __init__(self,origin):self.origin=origin
  def read(self,n=-1):
   if n<0:n=1024*1024
   data=self.origin.read(n)
   if data:self.total+=len(data);full_hash.update(data)
   return data
 packet_count=0
 total_iextp_packets=0
 seq_expected={}
 seq_gaps=[]
 duplicates=[]
 unexpected_protocol=0
 first_window={s:{} for s in symbols}
 breaking={s:set() for s in symbols}
 break_events={s:0 for s in symbols}
 known={s:0 for s in symbols}
 def observe(payload):
  nonlocal total_iextp_packets,unexpected_protocol
  if len(payload)<40 or payload[0]!=1:return
  proto=struct.unpack_from('<H',payload,2)[0]
  if proto!=0x8003:
   unexpected_protocol+=1
   return
  count=struct.unpack_from('<H',payload,14)[0]
  if count==0:return
  channel=struct.unpack_from('<I',payload,4)[0]
  session=struct.unpack_from('<I',payload,8)[0]
  seq=struct.unpack_from('<Q',payload,24)[0]
  total_iextp_packets+=1
  key=(proto,channel,session)
  before=seq_expected.get(key)
  if before is not None:
   if seq>before:
    if len(seq_gaps)<30:seq_gaps.append({'channel':channel,'session':session,'expected':before,'observed':seq})
   elif seq<before:
    if len(duplicates)<30:duplicates.append({'channel':channel,'session':session,'expected':before,'observed':seq})
  seq_expected[key]=max(before or 0,seq+count)
 if local_file is not None:
  input_source=open(local_file,'rb')
 else:
  req=urllib.request.Request(url,headers={'User-Agent':'SMFGU-tradebreak-integrity-review/1.0','Accept-Encoding':'identity'})
  input_source=urllib.request.urlopen(req,timeout=180)
 with input_source as remote:
  tracked=Tracking(remote)
  with gzip.GzipFile(fileobj=tracked,mode='rb') as unzipped:
   for packet,(nano,sym,qty,price,trade_id,flags,kind) in stream_pcapng(
        unzipped,symbol_filter=set(symbols),include_breaks=True,packet_observer=observe):
    packet_count=max(packet_count,packet)
    if kind=='B':
     breaking[sym].add(trade_id);break_events[sym]+=1
     continue
    known[sym]+=1
    event=dt.datetime.fromtimestamp(nano/1000000000,UTC)
    if event<start or event>=end:continue
    first_window[sym].setdefault(trade_id,[]).append((nano,packet,price,qty,flags))
 if tracked.total!=size or full_hash.hexdigest()!=expected_sha.lower():
  raise ValueError('Full original IEX archive bytes or pinned SHA256 differ')
 summary={}
 for sym,ids in first_window.items():
  live=[(trade_id,*event) for trade_id,events in ids.items()
        if trade_id not in breaking[sym] for event in events]
  live.sort(key=lambda x:(x[1],x[2],x[0]))
  grouped={}
  for trade_id,nano,packet,price,qty,flags in live:
   moment=dt.datetime.fromtimestamp(nano/1000000000,UTC).replace(second=0,microsecond=0)
   minute=moment.isoformat().replace('+00:00','Z')
   row=grouped.setdefault(minute,{'timestamp_utc':minute,'open':None,'high':None,'low':None,'close':None,
     'volume':0,'observed_trades':0,'last_sale_eligible_trades':0,'unreviewed_flags':{}})
   accumulate_trade(row,price,qty,flags)
  rows=[{**row,'open':f"{row['open']/10000:.4f}",'high':f"{row['high']/10000:.4f}",
            'low':f"{row['low']/10000:.4f}",'close':f"{row['close']/10000:.4f}"}
        for _,row in sorted(grouped.items()) if row['open'] is not None]
  summary[sym]={'bar_count':len(rows),'reported_trade_events_day':known[sym],
                'broken_trade_messages':break_events[sym],
                'first_window_trade_ids':len(ids),
                'first_window_trade_ids_broken':len(set(ids)&breaking[sym]),
                'bars':rows}
 return {'schema':'groundup.iex_full_day_reconciliation.v1',
   'date_et':day,'status':'FULL_DAY_SOURCE_RECONCILED_PENDING_INDEPENDENT_AND_OWNER_REVIEW',
   'member_publication_approved':False,
   'official_source':'IEX_HIST_TOPS_1.6',
   'source_sha256':full_hash.hexdigest(),'source_bytes':size,
   'source_filename':name,'source_acquisition':'LOCAL_OWNER_ARCHIVE' if local_file is not None else 'OFFICIAL_REMOTE_ARCHIVE',
   'local_archive_sha256_and_size_matched':True if local_file is not None else None,
   'pcapng_packets_scanned':packet_count,'iextp_message_packets':total_iextp_packets,
   'iextp_session_keys_seen':len(seq_expected),
   'iextp_sequence_gaps_sample':seq_gaps,'iextp_sequence_overlap_sample':duplicates,
   'sequence_gaps_or_duplicates_require_review':bool(seq_gaps or duplicates),
   'non_TOPS_packet_count':unexpected_protocol,
   'venue_scope':'IEX_ONLY_NOT_SIP_NOT_NBBO',
   'sale_condition_policy':'Last-sale/high-low exclude odd lot and extended-hours; volume includes all venue trades',
   'trade_breaks_matched_by_original_trade_id':True,
   'symbols':summary}
def main():
 p=argparse.ArgumentParser();p.add_argument('--date',required=True);p.add_argument('--symbols',required=True);p.add_argument('--expected-sha256',required=True);p.add_argument('--output',type=Path,required=True)
 p.add_argument('--file',type=Path,help='Use owner-downloaded original IEX archive; no network access')
 p.add_argument('--expected-bytes',type=int,help='Exact official catalog compressed byte count; required for local archive')
 a=p.parse_args();symbols=[x.strip().upper() for x in a.symbols.split(',')]
 if len(symbols)<1 or len(symbols)>10 or len(set(symbols))!=len(symbols) or any(not x.isalpha() or len(x)>5 for x in symbols):raise SystemExit('Invalid source selection')
 if len(a.expected_sha256)!=64 or any(c not in '0123456789abcdef' for c in a.expected_sha256.lower()):raise SystemExit('Invalid full source hash')
 if any(x.lower() in ('public','assets','docs','functions') for x in a.output.parts):raise SystemExit('Only private quarantine output')
 if a.file is not None and a.expected_bytes is None:raise SystemExit('--expected-bytes is mandatory when --file is supplied')
 d=full_review(a.date,symbols,a.expected_sha256,a.file,a.expected_bytes)
 a.output.parent.mkdir(parents=True,exist_ok=True)
 a.output.write_text(json.dumps(d,indent=2,sort_keys=True)+'\n')
 print(json.dumps({'status':d['status'],'original_sha_verified':True,'pcapng_packets':d['pcapng_packets_scanned'],
   'iextp_packets':d['iextp_message_packets'],'sessions':d['iextp_session_keys_seen'],
   'sequence_gaps':len(d['iextp_sequence_gaps_sample']),
   'sequence_overlaps':len(d['iextp_sequence_overlap_sample']),
   'symbols':{k:{n:v[n] for n in ('bar_count','first_window_trade_ids_broken','broken_trade_messages')} for k,v in d['symbols'].items()}}),flush=True)
if __name__=='__main__':main()
