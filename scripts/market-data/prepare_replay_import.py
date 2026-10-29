#!/usr/bin/env python3
"""Prepare authentic IEX OHLCV for EXISTING private Supabase tables.

Produces *draft* CSV files and review manifest. NEVER publishes source data,
approves a legal license, imports into the database or grades any learner.
"""
import argparse
import csv
from datetime import datetime, date, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re
import sys
from zoneinfo import ZoneInfo

CODE = re.compile(r'^[A-Z][A-Z0-9_-]{2,79}$')
TICKER = re.compile(r'^[A-Z][A-Z0-9.]{0,11}$')
HEX64 = re.compile(r'^[a-f0-9]{64}$', re.I)
NY = ZoneInfo('America/New_York')


def validate_and_prepare(doc, dataset_code):
    if not CODE.fullmatch(dataset_code):
        raise ValueError('Dataset code is not canonical.')
    if not isinstance(doc, dict) or doc.get('schema') != 'groundup.iex_tops.bars.v1':
        raise ValueError('Unrecognized IEX decoder contract.')
    if doc.get('source') != 'IEX_HIST' or doc.get('feed') != 'TOPS_1.6' or doc.get('exchange') != 'IEX':
        raise ValueError('IEX source/feed provenance mismatch.')
    if doc.get('eligible_for_member_release') is not False or doc.get('status') != 'quarantined_pending_owner_review':
        raise ValueError('Only unapproved quarantined source evidence can enter review.')
    if doc.get('market_scope') != 'SINGLE_EXCHANGE_IEX_ONLY_NOT_SIP_NOT_NBBO':
        raise ValueError('IEX must be classified as single-exchange, not SIP/NBBO.')
    symbol = doc.get('symbol')
    if not isinstance(symbol, str) or not TICKER.fullmatch(symbol):
        raise ValueError('Invalid trading symbol.')
    day = doc.get('trading_date_ny')
    if not isinstance(day, str) or date.fromisoformat(day).isoformat() != day:
        raise ValueError('Invalid trading date.')
    interval = doc.get('interval_seconds')
    if interval not in (60, 300):
        raise ValueError('Unsupported interval.')
    origin = doc.get('provenance') or {}
    if not HEX64.fullmatch(str(origin.get('source_sha256', ''))):
        raise ValueError('Missing authentic capture checksum.')
    if 'iex.io/legal/hist-data-terms' not in str(origin.get('terms_url', '')):
        raise ValueError('Provider license evidence is missing.')
    rows = doc.get('bars')
    if not isinstance(rows, list) or len(rows) < 2 or len(rows) > 800:
        raise ValueError('A bounded, real sequential session requires 2–800 bars.')
    if doc.get('counts', {}).get('bar_count') != len(rows):
        raise ValueError('Bar-count provenance mismatch.')
    prepared = []
    prior = None
    for i, b in enumerate(rows):
        if not isinstance(b, dict) or b.get('index') != i:
            raise ValueError('Bar indices must be contiguous from zero.')
        stamp = b.get('timestamp_utc')
        if not isinstance(stamp, str):
            raise ValueError('Missing UTC observation timestamp.')
        moment = datetime.fromisoformat(stamp.replace('Z', '+00:00'))
        if moment.tzinfo is None or moment.utcoffset() != timezone.utc.utcoffset(moment):
            raise ValueError('Observation timestamp is not UTC.')
        local = moment.astimezone(NY)
        if local.date().isoformat() != day or not (9 * 60 + 30 <= local.hour * 60 + local.minute < 16 * 60):
            raise ValueError('Observation outside the selected local trading session.')
        if moment.minute * 60 % interval != 0 or moment.second or moment.microsecond:
            raise ValueError('Bar alignment invalid.')
        if prior is not None and (moment - prior).total_seconds() < interval:
            raise ValueError('Historical data must be strictly increasing with no overlap.')
        prior = moment
        try:
            op,hi,lo,cl = (Decimal(str(b[k])) for k in ('open','high','low','close'))
        except (KeyError, ValueError, InvalidOperation) as exc:
            raise ValueError('Bad price decimals.') from exc
        if any(not v.is_finite() or v <= 0 or v.as_tuple().exponent < -4 for v in (op,hi,lo,cl)):
            raise ValueError('Prices must be positive with at most four decimals.')
        if hi < max(op,cl) or lo > min(op,cl) or lo > hi:
            raise ValueError('Historical candle OHLC invariant failed.')
        vol = b.get('volume')
        if not isinstance(vol, int) or vol < 0:
            raise ValueError('Invalid venue-only share volume.')
        prepared.append(dict(dataset_code=dataset_code,bar_index=i,bar_at=stamp,
                             open=str(op),high=str(hi),low=str(lo),close=str(cl),volume=vol))
    metadata = {
        'data_source':'IEX_HIST','venue_scope':'IEX_SINGLE_VENUE',
        'real_market_security':True,'source_date':day,'source_sha256':origin['source_sha256'],
        'original_synthetic':False,'historical_evidence_verified':False,
        'evidence_verified':False,'licensed_for_member_display':False,
        'trading_conditions_reviewed':False,'packet_integrity_reviewed':False,
        'corporate_actions_reviewed':False,'license_publication_reviewed':False,
        'ondemand_training_approved':False,'reviewed_by':'','reviewed_at':'',
        'corporate_action_policy':'REQUIRES_REVIEW',
        'source_feed':'TOPS_1.6','source_file':origin.get('source_file'),
        'data_origin_scope':'IEX ONLY. Not national consolidated prints, NBBO or broker executions.'
    }
    dataset = {
        'dataset_code':dataset_code,'title':f'IEX historical evidence review: {symbol} {day}',
        'ticker':symbol,'dataset_type':'ohlcv','interval_label':f'{interval//60}-minute',
        'timezone':'America/New_York','start_at':prepared[0]['bar_at'],
        'end_at':prepared[-1]['bar_at'],'raw_adjusted':'raw',
        'source_attribution':'Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use. https://www.iex.io/legal/hist-data-terms',
        'license_note':'DRAFT: confirm IEX HIST reuse, attribution and commercial publishing conditions.',
        'status':'draft','metadata':json.dumps(metadata,sort_keys=True,separators=(',',':'))
    }
    review = {
        'dataset_code':dataset_code,'status':'NOT_APPROVED_FOR_MEMBER_OR_LAB_DISPLAY',
        'source_file':origin.get('source_file'),'source_sha256':origin['source_sha256'],
        'symbol':symbol,'date_et':day,'bars':len(prepared),
        'checks_required':['IEX feed version and actual file authenticity',
             'Packet sequence completeness, missing messages and retransmission handling',
             'Qualification of TOPS Trade Reports/flags and sale-condition filtering',
             'Early-close and holiday session validation','Corporate actions and exact timestamp alignment',
             'IEX-only venue scope, chart labeling and nonconsolidated volume disclaimer',
             'Commercial redistribution license/attribution approved',
             'No-lookahead member replay, access entitlements and documented lab grading']
    }
    return dataset, prepared, review


def main(argv=None):
    p = argparse.ArgumentParser(description='Stage a draft IEX session in two private CSVs; no database writes.')
    p.add_argument('--input',required=True,type=Path)
    p.add_argument('--dataset-code',required=True)
    p.add_argument('--out-dir',required=True,type=Path)
    args=p.parse_args(argv)
    # Do not accidentally place original market-data files on a published site.
    if any(x.lower() in ('public','assets','functions','data','docs') for x in args.out_dir.parts):
        p.error('Choose a private working folder outside the website deployment tree.')
    target=args.out_dir.resolve()
    if target.exists() and any(target.iterdir()):
        p.error('Output directory must be empty; existing work cannot be overwritten.')
    try:
        raw=args.input.read_bytes()
        if len(raw)>12_000_000:
            raise ValueError('Quarantined source JSON exceeds bounded processing size.')
        dataset, bars, review=validate_and_prepare(json.loads(raw),args.dataset_code.upper())
        review['input_sha256']=hashlib.sha256(raw).hexdigest()
        target.mkdir(parents=True,exist_ok=True)
        with (target/'market_datasets_DRAFT.csv').open('w',newline='',encoding='utf8') as f:
            w=csv.DictWriter(f,fieldnames=list(dataset));w.writeheader();w.writerow(dataset)
        with (target/'gu_replay_bars_v01492_DRAFT.csv').open('w',newline='',encoding='utf8') as f:
            w=csv.DictWriter(f,fieldnames=list(bars[0]));w.writeheader();w.writerows(bars)
        (target/'owner_review_REQUIRED.json').write_text(json.dumps(review,indent=2,sort_keys=True)+'\n',encoding='utf8')
        print('DRAFT ONLY: %d IEX-only bars prepared; ZERO database/publication actions.'%len(bars),file=sys.stderr)
    except (OSError,ValueError,KeyError) as e:
        p.exit(2,'Import staging rejected: '+str(e)+'\n')


if __name__=='__main__':
    main()
