#!/usr/bin/env python3
"""IEX HIST TOPS 1.6 PCAP trade extractor: private, unapproved and no-cost.

Inputs must be genuine IEX HIST files obtained from authorized IEX channels.
Only protocol test fixtures are synthetic. Never serve an extracted dataset to
members without licensing, sale-condition, packet and corporate-action review.
"""
import argparse
import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import sys
import tempfile
from zoneinfo import ZoneInfo

NY = ZoneInfo('America/New_York')
UTC = dt.timezone.utc
SYMBOL = re.compile(r'^[A-Z][A-Z0-9.]{0,9}$')
NAME = re.compile(r'^(?:data_feeds_(?P<prefix_date>\d{8})_)?(?P<source_date>\d{8})_IEXTP1_TOPS1\.6\.pcap(?:\.gz)?$', re.I)
MAX_PACKET = 2097152


class CaptureError(ValueError):
    pass


def read_exact(f, n, eof=False):
    b = f.read(n)
    if len(b) == n:
        return b
    if not b and eof:
        return None
    raise CaptureError('Incomplete PCAP capture: never publish partial data.')


def udp_payload(frame, linktype):
    if linktype == 1:
        if len(frame) < 14:
            return None
        eth = int.from_bytes(frame[12:14], 'big')
        start = 14
        for _ in range(2):
            if eth not in (0x8100, 0x88A8):
                break
            if len(frame) < start + 4:
                return None
            eth = int.from_bytes(frame[start + 2:start + 4], 'big')
            start += 4
        if eth != 0x0800:
            return None
    elif linktype in (101, 12):
        start = 0
    else:
        raise CaptureError('Unsupported PCAP link type (Ethernet/IPv4 expected).')
    if len(frame) < start + 20 or frame[start] >> 4 != 4:
        return None
    ihl = (frame[start] & 15) * 4
    if ihl < 20 or len(frame) < start + ihl + 8 or frame[start + 9] != 17:
        return None
    if int.from_bytes(frame[start + 6:start + 8], 'big') & 0x3fff:
        return None  # reject fragment; do not misparse as a full UDP payload
    udp = start + ihl
    size = int.from_bytes(frame[udp + 4:udp + 6], 'big')
    if size < 8 or len(frame) < udp + size:
        raise CaptureError('Truncated UDP datagram.')
    return frame[udp + 8:udp + size]


def trades_from_payload(p):
    if len(p) < 40 or p[0] != 1:
        return
    payload_size, count = struct.unpack_from('<HH', p, 12)
    if payload_size != len(p) - 40:
        raise CaptureError('IEX-TP payload size mismatch; review feed version.')
    off = 40
    for _ in range(count):
        if off + 2 > len(p):
            raise CaptureError('Missing IEX message length.')
        size = struct.unpack_from('<H', p, off)[0]
        off += 2
        if size < 1 or off + size > len(p):
            raise CaptureError('IEX message boundary invalid.')
        body = p[off:off + size]
        off += size
        if body[0] != 0x54:
            continue
        if len(body) != 38:
            raise CaptureError('TOPS trade layout changed. Review protocol.')
        timestamp_ns = struct.unpack_from('<q', body, 2)[0]
        try:
            ticker = body[10:18].rstrip(b' \x00').decode('ascii')
        except UnicodeDecodeError as e:
            raise CaptureError('Bad symbol encoding.') from e
        qty = struct.unpack_from('<I', body, 18)[0]
        price_x10000 = struct.unpack_from('<q', body, 22)[0]
        trade_id = struct.unpack_from('<q', body, 30)[0]
        if not SYMBOL.fullmatch(ticker) or not 0 < qty <= 50_000_000 or price_x10000 <= 0 or timestamp_ns <= 0:
            raise CaptureError('Invalid price, size, timestamp or symbol.')
        yield timestamp_ns, ticker, qty, price_x10000, trade_id, body[1]
    if off != len(p):
        raise CaptureError('IEX message count and data length disagree.')


def stream_pcap(f):
    magic = read_exact(f, 4)
    if magic == b'\x0a\x0d\x0d\x0a':
        raise CaptureError('PCAPNG unsupported: do not misinterpret PCAPNG as PCAP.')
    if magic == b'\xd4\xc3\xb2\xa1':
        endian = '<'
    elif magic == b'\xa1\xb2\xc3\xd4':
        endian = '>'
    else:
        raise CaptureError('Not classic PCAP.')
    major, minor, _, _, snaplen, linktype = struct.unpack(endian + 'HHiIII', read_exact(f, 20))
    if (major, minor) != (2, 4) or not 64 <= snaplen <= MAX_PACKET:
        raise CaptureError('Invalid PCAP global header.')
    packet = 0
    while True:
        hdr = read_exact(f, 16, eof=True)
        if hdr is None:
            return
        _, _, incl, original = struct.unpack(endian + 'IIII', hdr)
        if incl > snaplen or incl > MAX_PACKET or incl > original:
            raise CaptureError('Invalid packet length.')
        frame = read_exact(f, incl)
        packet += 1
        p = udp_payload(frame, linktype)
        if p is not None:
            for t in trades_from_payload(p):
                yield packet, t


def bar_export(file, symbol, ny_date, interval=60, max_trades=300000):
    match = NAME.fullmatch(file.name)
    if not match:
        raise CaptureError('Capture filename must explicitly declare IEXTP1_TOPS1.6.')
    expected = ny_date.replace('-', '')
    if match.group('source_date') != expected or (match.group('prefix_date') and match.group('prefix_date') != expected):
        raise CaptureError('Capture filename date does not match selected date.')
    if not SYMBOL.fullmatch(symbol) or interval not in (60, 300):
        raise CaptureError('Symbol or interval invalid.')
    trades = []
    opening = gzip.open if file.name.lower().endswith('.gz') else open
    with opening(file, 'rb') as f:
        for packet, (nanos, ticker, quantity, px, ident, flags) in stream_pcap(f):
            if ticker != symbol:
                continue
            try:
                seconds, rem = divmod(nanos, 1_000_000_000)
                stamp = dt.datetime.fromtimestamp(seconds, UTC).replace(microsecond=rem // 1000)
            except (ValueError, OverflowError, OSError) as e:
                raise CaptureError('Timestamp outside expected range.') from e
            local = stamp.astimezone(NY)
            if local.date().isoformat() != ny_date or not dt.time(9, 30) <= local.time() < dt.time(16):
                continue
            trades.append((nanos, packet, px, quantity, ident, flags))
            if len(trades) > max_trades:
                raise CaptureError('Selected data exceeds bounded trade limit: partition the session.')
    if not trades:
        raise CaptureError('No selected real regular-session trades: refuse empty/fake bars.')
    trades.sort(key=lambda v: (v[0], v[1]))
    grouped = {}
    for timestamp, packet, px, quantity, ident, flags in trades:
        bucket = timestamp // (interval * 1_000_000_000) * (interval * 1_000_000_000)
        b = grouped.get(bucket)
        if b is None:
            grouped[bucket] = dict(open=px, high=px, low=px, close=px, volume=quantity, n=1)
        else:
            b['high'] = max(px, b['high'])
            b['low'] = min(px, b['low'])
            b['close'] = px
            b['volume'] += quantity
            b['n'] += 1
    def decimal_price(ticks):
        return f'{ticks // 10000}.{ticks % 10000:04d}'
    bars = []
    for idx, (bucket, row) in enumerate(sorted(grouped.items())):
        moment = dt.datetime.fromtimestamp(bucket // 1_000_000_000, UTC).isoformat().replace('+00:00', 'Z')
        bars.append(dict(index=idx, timestamp_utc=moment, open=decimal_price(row['open']),
                         high=decimal_price(row['high']), low=decimal_price(row['low']),
                         close=decimal_price(row['close']), volume=row['volume'], trade_count=row['n']))
    digest = hashlib.sha256()
    with open(file, 'rb') as raw:
        for chunk in iter(lambda: raw.read(4194304), b''):
            digest.update(chunk)
    return dict(schema='groundup.iex_tops.bars.v1', status='quarantined_pending_owner_review',
                eligible_for_member_release=False, source='IEX_HIST', exchange='IEX', feed='TOPS_1.6',
                market_scope='SINGLE_EXCHANGE_IEX_ONLY_NOT_SIP_NOT_NBBO',
                data_kind='actual_historical_venue_trades', trading_date_ny=ny_date, symbol=symbol,
                session='regular_09:30-16:00_America/New_York', interval_seconds=interval,
                raw_vs_adjusted='RAW_NOT_CORPORATE_ACTION_ADJUSTED',
                requires_corporate_action_review=True, requires_trade_condition_review=True,
                requires_packet_gap_review=True, requires_license_and_publication_approval=True,
                provenance=dict(source_file=file.name, source_sha256=digest.hexdigest(),
                   terms_url='https://www.iex.io/legal/hist-data-terms',
                   attribution='Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use.',
                   note='IEX-only trades, not national volume, NBBO, observed member execution or a consolidated closing print.'),
                counts=dict(selected_venue_trades=len(trades), bar_count=len(bars)), bars=bars)


def main(argv=None):
    ap = argparse.ArgumentParser(description='Quarantine real IEX TOPS 1.6 records, no automatic public release.')
    ap.add_argument('--file', required=True, type=Path)
    ap.add_argument('--symbol', required=True, type=str.upper)
    ap.add_argument('--date', required=True)
    ap.add_argument('--interval-seconds', type=int, choices=(60, 300), default=60)
    ap.add_argument('--output', required=True, type=Path)
    args = ap.parse_args(argv)
    try:
        if dt.date.fromisoformat(args.date).isoformat() != args.date:
            raise ValueError('Date must be YYYY-MM-DD.')
        if any(p in ('public', 'assets', 'data', 'learn', 'functions') for p in args.output.parts):
            raise CaptureError('Never write quarantined evidence under web-published/runtime folders.')
        if args.file.resolve() == args.output.resolve():
            raise CaptureError('Output cannot overwrite input.')
        result = bar_export(args.file, args.symbol, args.date, args.interval_seconds)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile('w', encoding='utf8', dir=args.output.parent,
                                          prefix='.review-', suffix='.json', delete=False) as f:
            temp = Path(f.name)
            json.dump(result, f, indent=2, sort_keys=True)
            f.write('\n')
        os.replace(temp, args.output)
        print('QUARANTINED: %s IEX trades; %s bars; NOT member approved' %
              (result['counts']['selected_venue_trades'], result['counts']['bar_count']), file=sys.stderr)
    except (ValueError, OSError, EOFError, gzip.BadGzipFile) as exc:
        ap.exit(2, 'Ingestion rejected: '+str(exc)+'\n')


if __name__ == '__main__':
    main()
