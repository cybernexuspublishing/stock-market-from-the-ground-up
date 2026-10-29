#!/usr/bin/env python3
"""Bounded authenticated-origin (official IEX HIST) raw archive research capture.

No rehosting or member publication. Uses only official IEX API/GCS link, caps
network bytes, and stops after the requested morning. Output is restricted
quarantine evidence and MUST NOT be treated as a complete-capture hash.
"""
import argparse, datetime as dt, gzip, hashlib, json, pathlib, re, sys, urllib.request
from urllib.parse import urlparse, unquote
from zoneinfo import ZoneInfo
from iex_tops import stream_pcap
from pcapng_iex_reader import stream_pcapng

NY=ZoneInfo("America/New_York")
UTC=dt.timezone.utc
SAFE_TICKERS=re.compile(r"^[A-Z][A-Z0-9.]{0,9}$")
class BudgetExceeded(Exception): pass
class LimitedStream:
    def __init__(self, stream, budget):
        self.stream=stream;self.budget=budget;self.total=0;self.hash=hashlib.sha256()
    def read(self,n=-1):
        if n<0:n=65536
        if self.total>=self.budget:raise BudgetExceeded("Compressed byte budget reached")
        n=min(n,self.budget-self.total)
        chunk=self.stream.read(n)
        if chunk:
            self.total+=len(chunk);self.hash.update(chunk)
        return chunk
def official_link(day):
    api='https://iextrading.com/api/1.0/hist?date='+day.replace('-','')
    with urllib.request.urlopen(urllib.request.Request(api,headers={'User-Agent':'SMFGU-historical-source-research/1.0'}),timeout=40) as r:
        if urlparse(r.url).hostname!='iextrading.com': raise ValueError("Unexpected official catalog redirect")
        rows=json.load(r)
    if not isinstance(rows,list):raise ValueError("No official catalog list")
    for entry in rows:
        if entry.get('date')!=day.replace('-','') or entry.get('feed')!='TOPS' or entry.get('version')!='1.6' or entry.get('protocol')!='IEXTP1':continue
        u=entry.get('link','')
        p=urlparse(u);decoded=unquote(p.path)
        name=day.replace('-','')+'_IEXTP1_TOPS1.6.pcap.gz'
        if p.scheme!='https' or p.hostname!='www.googleapis.com' or not decoded.endswith('/'+name) or '/b/iex/o/data/feeds/'+day.replace('-','')+'/' not in decoded:
            raise ValueError("Rejected nonofficial or mismatched IEX object path")
        size=int(entry['size'])
        if not (100000<size<30000000000):raise ValueError("Unexpected source size")
        return u,size,name
    raise ValueError("No matching TOPS 1.6 archive in official catalog")
def accumulate_trade(row,px,qty,flags):
    """IEX venue volume includes every reported execution; OHLC excludes odd lots and Form-T."""
    row['volume']+=qty
    row['observed_trades']+=1
    row['unreviewed_flags'][str(flags)]=row['unreviewed_flags'].get(str(flags),0)+1
    if flags & 0x60:
        return
    if row['open'] is None:
        row.update(open=px,high=px,low=px,close=px)
    else:
        row['high']=max(row['high'],px)
        row['low']=min(row['low'],px)
        row['close']=px
    row['last_sale_eligible_trades']+=1

def capture(day,tickers,minutes,byte_budget):
    url,source_size,name=official_link(day)
    start=dt.datetime.combine(dt.date.fromisoformat(day),dt.time(9,30),NY).astimezone(UTC)
    end=start+dt.timedelta(minutes=minutes)
    expected={t:{} for t in tickers}
    packet_counts={t:0 for t in tickers}
    last_trade=None;complete=False;read_error=None
    req=urllib.request.Request(url,headers={'User-Agent':'SMFGU-historical-source-research/1.0','Accept-Encoding':'identity'})
    with urllib.request.urlopen(req,timeout=120) as res:
        if urlparse(res.url).hostname not in ('www.googleapis.com','storage.googleapis.com'):
            raise ValueError("Non-authorized source redirect")
        stream=LimitedStream(res,byte_budget)
        try:
            with gzip.GzipFile(fileobj=stream,mode='rb') as g:
                records=stream_pcapng(g, set(tickers)) if g.peek(4)[:4]==b'\x0a\x0d\x0d\x0a' else stream_pcap(g)
                for packet,(nano,symbol,qty,px,trade_id,flags) in records:
                    try:t=dt.datetime.fromtimestamp(nano/1000000000,UTC)
                    except (OverflowError,OSError,ValueError):continue
                    if t>=end+dt.timedelta(minutes=1):
                        complete=True;break
                    if t<start or t>=end or symbol not in expected:continue
                    minute=t.replace(second=0,microsecond=0).isoformat().replace('+00:00','Z')
                    row=expected[symbol].get(minute)
                    if row is None:
                        row={'timestamp_utc':minute,'open':None,'high':None,'low':None,'close':None,'volume':0,
                             'observed_trades':0,'last_sale_eligible_trades':0,'unreviewed_flags':{}}
                        expected[symbol][minute]=row
                    accumulate_trade(row,px,qty,flags)
                    packet_counts[symbol]+=1
        except BudgetExceeded as e:
            read_error=str(e)
        except (EOFError,gzip.BadGzipFile) as e:
            # A clipped compressed stream cannot validate full gzip integrity.
            read_error=type(e).__name__+': '+str(e)[:180]
    return {
      'schema':'groundup.iex_historical_quarantine_probe.v1',
      'status':'quarantined_pending_source_and_license_review',
      'eligible_for_member_release':False,
      'official_source':'IEX_HIST_TOPS_1.6',
      'venue_scope':'IEX_SINGLE_VENUE_NOT_SIP_NOT_NBBO',
      'date_et':day,'window_et':'09:30-'+(dt.datetime(2000,1,1,9,30)+dt.timedelta(minutes=minutes)).strftime('%H:%M'),
      'origin_catalog':'https://iextrading.com/api/1.0/hist?date='+day.replace('-',''),
      'original_capture_file':name,'original_catalog_size_bytes':source_size,
      'source_file_sha256':None,
      'downloaded_prefix_sha256_NOT_FULL_CAPTURE':stream.hash.hexdigest(),
      'compressed_bytes_examined':stream.total,
      'window_scan_reached_end':complete,
      'capture_integrity_fully_verified':False,
      'trade_conditions_reviewed':False,'packet_sequence_complete':False,
      'last_sale_high_low_policy':'IEX_TOPS_1.66_NON_ODD_LOT_REGULAR_SESSION_ONLY',
      'source_attribution':'Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use. https://www.iex.io/legal/hist-data-terms',
      'stop_reason':'reached_window_end' if complete else read_error or 'stream_ended',
      'symbols':{sym:{'observed_bars':sum(row['open'] is not None for row in rows.values()),
                   'all_trade_minutes':len(rows),'observed_trade_count':packet_counts[sym],
                   'no_eligible_last_sale_minutes':[minute for minute,row in sorted(rows.items()) if row['open'] is None],
                   'records':[{**row,
                     'open':f"{row['open']/10000:.4f}",'high':f"{row['high']/10000:.4f}",
                     'low':f"{row['low']/10000:.4f}",'close':f"{row['close']/10000:.4f}"}
                     for _,row in sorted(rows.items()) if row['open'] is not None]}
                 for sym,rows in expected.items()}
    }
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--date',required=True)
    ap.add_argument('--tickers',required=True,help='Comma separated stock symbols')
    ap.add_argument('--minutes',type=int,default=30)
    ap.add_argument('--max-compressed-mib',type=int,default=256)
    ap.add_argument('--output',required=True,type=pathlib.Path)
    args=ap.parse_args()
    if dt.date.fromisoformat(args.date).isoformat()!=args.date:ap.error('Invalid date')
    if not 2<=args.minutes<=60 or not 1<=args.max_compressed_mib<=512:ap.error('Caps exceeded')
    symbols=list(dict.fromkeys(x.strip().upper() for x in args.tickers.split(',')))
    if not symbols or len(symbols)>12 or any(not SAFE_TICKERS.fullmatch(t) for t in symbols):ap.error('Invalid symbols')
    if any(part.lower() in ('assets','public','docs','functions','data') for part in args.output.parts):ap.error('Quarantine destination must not be in website tree')
    result=capture(args.date,symbols,args.minutes,args.max_compressed_mib*1048576)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2,sort_keys=True)+'\n',encoding='utf8')
    print(json.dumps({'date':result['date_et'],'size':result['original_catalog_size_bytes'],
      'compressed_examined':result['compressed_bytes_examined'],
      'window_complete':result['window_scan_reached_end'],
      'stop_reason':result['stop_reason'],
      'symbols':{s:{'bar_count':v['observed_bars'],'trades':v['observed_trade_count']} for s,v in result['symbols'].items()},
      'approval':'QUARANTINE_ONLY_NO_MEMBER_PUBLICATION'}))
if __name__=='__main__':main()
