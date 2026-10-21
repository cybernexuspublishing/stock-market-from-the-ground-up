#!/usr/bin/env python3
"""Free SEC EDGAR JSON ingestion into an offline quarantined review file.
This script does NOT implement a public server proxy or API key store.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.request import Request, urlopen

CIK = re.compile(r'^[0-9]{1,10}$')
SEC_ORIGIN = 'https://data.sec.gov'


def get_submissions(cik, user_agent, fetch=urlopen):
    if not CIK.fullmatch(str(cik)) or int(cik) == 0:
        raise ValueError('A valid SEC CIK is required.')
    if len(user_agent) < 16 or not re.search(r'[^\s@]+@[^\s@]+\.[^\s@]+', user_agent):
        raise ValueError('Supply SEC_USER_AGENT with business name and real contact email.')
    url = f'{SEC_ORIGIN}/submissions/CIK{int(cik):010d}.json'
    req = Request(url, headers={'User-Agent':user_agent,'Accept':'application/json'})
    with fetch(req, timeout=20) as response:
        raw = response.read(8_000_001)
    if len(raw) > 8_000_000:
        raise ValueError('SEC data exceeded bounded JSON size.')
    data = json.loads(raw)
    if not isinstance(data, dict) or int(data.get('cik', -1)) != int(cik) or not isinstance(data.get('filings'), dict):
        raise ValueError('SEC submissions CIK/structure validation failed.')
    return dict(schema='groundup.sec.submissions.v1', status='quarantined_pending_review',
        eligible_for_member_release=False, source='SEC_EDGAR', api_key_required=False,
        requested_url=url, acquired_utc=dt.datetime.now(dt.timezone.utc).isoformat(),
        sha256=hashlib.sha256(raw).hexdigest(),
        licensing_note='SEC government-created and public EDGAR filing text is generally reusable; third-party exhibits require review.',
        data=data)


def main():
    ap = argparse.ArgumentParser(description='Offline owner-review copy of SEC submissions; no API key required.')
    ap.add_argument('--cik',required=True)
    ap.add_argument('--output',required=True,type=Path)
    args = ap.parse_args()
    if any(part in ('public','assets','data','functions','learn') for part in args.output.parts):
        ap.exit(2,'Refusing to write SEC review data to public/runtime folders.\n')
    try:
        data = get_submissions(args.cik, os.environ.get('SEC_USER_AGENT',''))
        args.output.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.NamedTemporaryFile('w',dir=args.output.parent,encoding='utf-8',
                                         prefix='.sec-',suffix='.json',delete=False) as f:
            tmp = Path(f.name)
            json.dump(data,f,indent=2,sort_keys=True)
            f.write('\n')
        os.replace(tmp,args.output)
        print('SEC submissions QUARANTINED for Owner review; NOT published.',file=sys.stderr)
    except Exception as e:
        ap.exit(2,'SEC acquisition rejected: '+str(e)+'\n')


if __name__=='__main__':
    main()
