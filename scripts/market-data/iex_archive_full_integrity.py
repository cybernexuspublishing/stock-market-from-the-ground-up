#!/usr/bin/env python3
"""One-time official IEX archive full-byte fingerprint; does NOT publish trade data."""
import argparse,hashlib,json,pathlib,urllib.request,zlib
from iex_historical_archive_probe import official_link
def run(day,max_bytes):
 url,size,filename=official_link(day)
 if size>max_bytes:raise ValueError("Source size exceeds Owner-approved bounded job budget")
 sha=hashlib.sha256();decompressor=zlib.decompressobj(16+zlib.MAX_WBITS)
 received=0;expanded=0
 req=urllib.request.Request(url,headers={'User-Agent':'SMFGU-historical-source-integrity/1.0','Accept-Encoding':'identity'})
 with urllib.request.urlopen(req,timeout=180) as stream:
  while received<size:
   chunk=stream.read(min(8*1048576,size-received))
   if not chunk:raise ValueError("Unexpected truncated original archive")
   received+=len(chunk);sha.update(chunk)
   data=decompressor.decompress(chunk)
   expanded+=len(data)
   if received%(512*1048576)<len(chunk):
    print(json.dumps({'compressed_verified_bytes_so_far':received,'total_expected':size}),flush=True)
 if received!=size or not decompressor.eof or decompressor.unused_data:
  raise ValueError('IEX gzip CRC, EOF, exact-length, or member-boundary validation failed')
 return {'schema':'groundup.iex_official_archive_integrity.v1','date_et':day,
  'original_capture_file':filename,'official_catalog_url':'https://iextrading.com/api/1.0/hist?date='+day.replace('-',''),
  'catalog_content_length':size,'actual_compressed_length':received,'decompressed_bytes':expanded,
  'full_original_gzip_sha256':sha.hexdigest(),'gzip_full_stream_valid':True,
  'raw_trade_conditions_reviewed':False,'packet_sequence_completeness_verified':False,
  'member_publication_approved':False,'status':'FULL_ARCHIVE_HASH_VERIFIED_NOT_RELEASED'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--date',required=True);p.add_argument('--max-mib',type=int,default=3000);p.add_argument('--output',type=pathlib.Path,required=True)
 a=p.parse_args()
 if a.max_mib<1 or a.max_mib>3000:raise SystemExit('Source download exceeds bounded allowance')
 payload=run(a.date,a.max_mib*1048576)
 if any(x.lower() in ('assets','public','docs','functions') for x in a.output.parts):raise SystemExit('Quarantine-only output path required')
 a.output.parent.mkdir(parents=True,exist_ok=True)
 a.output.write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n',encoding='utf8')
 print(json.dumps(payload,sort_keys=True),flush=True)
