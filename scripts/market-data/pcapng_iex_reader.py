#!/usr/bin/env python3
"""Strict PCAPNG reader for official IEX HIST TOPS 1.6, used only in quarantine.

Handles SHB, IDB, EPB and SPB. Never silently accepts malformed block lengths,
unknown link types or nonexistent interfaces. Existing classic-PCAP reader is
unchanged. Public replay release remains separately gated.
"""
import struct
from iex_tops import CaptureError, MAX_PACKET, SYMBOL, read_exact, udp_payload, trades_from_payload

SECTION=b'\x0a\x0d\x0d\x0a'
MAX_BLOCK=MAX_PACKET+65536

def filtered_trades(payload, accepted, include_breaks=False):
    """Validate the transport/message structure, but accept only requested tickers.

    IEX trade reports include securities with Nasdaq integrated symbols outside
    the classroom ticker alphabet. An unrelated symbol must not abort a valid
    requested-case extraction; malformed requested trades are always errors.
    """
    if len(payload)<40 or payload[0]!=1:
        return
    payload_size,count=struct.unpack_from('<HH',payload,12)
    if payload_size!=len(payload)-40:raise CaptureError('IEX payload size mismatch')
    pos=40
    for _ in range(count):
        if pos+2>len(payload):raise CaptureError('IEX message length missing')
        size=struct.unpack_from('<H',payload,pos)[0];pos+=2
        if size<1 or pos+size>len(payload):raise CaptureError('IEX message boundary invalid')
        body=payload[pos:pos+size];pos+=size
        if body[0] not in ((0x54,0x42) if include_breaks else (0x54,)):continue
        if len(body)!=38:raise CaptureError('Unexpected TOPS trade report layout')
        try:symbol=body[10:18].rstrip(b' \\x00').decode('ascii')
        except UnicodeDecodeError:
            raise CaptureError('Non-ASCII IEX trade symbol')
        if symbol not in accepted:continue
        nanos=struct.unpack_from('<q',body,2)[0]
        qty=struct.unpack_from('<I',body,18)[0]
        price=struct.unpack_from('<q',body,22)[0]
        trade_id=struct.unpack_from('<q',body,30)[0]
        if not SYMBOL.fullmatch(symbol) or nanos<=0 or price<=0 or qty<=0 or qty>50000000:
            raise CaptureError('Malformed selected-symbol TOPS trade')
        event=(nanos,symbol,qty,price,trade_id,body[1])
        yield (*event, 'B' if body[0]==0x42 else 'T') if include_breaks else event
    if pos!=len(payload):raise CaptureError('IEX message count mismatch')


def stream_pcapng(f, symbol_filter=None, include_breaks=False, packet_observer=None):
    endian=None
    links=[]
    packet=0
    while True:
        hdr=read_exact(f,8,eof=True)
        if hdr is None:return
        block_type=hdr[:4]
        if block_type==SECTION:
            magic=read_exact(f,4)
            if magic==b'\x4d\x3c\x2b\x1a':endian='<'
            elif magic==b'\x1a\x2b\x3c\x4d':endian='>'
            else:raise CaptureError('PCAPNG byte-order magic is invalid')
            size=struct.unpack(endian+'I',hdr[4:])[0]
            if size<28 or size>MAX_BLOCK or size%4:raise CaptureError('Invalid PCAPNG section size')
            tail=read_exact(f,size-12)
            if struct.unpack(endian+'I',tail[-4:])[0]!=size:raise CaptureError('PCAPNG section trailer mismatch')
            major,minor=struct.unpack_from(endian+'HH',tail,0)
            if major!=1:raise CaptureError('Unsupported PCAPNG major version')
            links=[]
            continue
        if endian is None:raise CaptureError('PCAPNG missing section header')
        type_num=struct.unpack(endian+'I',block_type)[0]
        size=struct.unpack(endian+'I',hdr[4:])[0]
        if size<12 or size>MAX_BLOCK or size%4:raise CaptureError('PCAPNG invalid block size')
        contents=read_exact(f,size-8)
        if struct.unpack(endian+'I',contents[-4:])[0]!=size:raise CaptureError('PCAPNG trailing block length mismatch')
        body=contents[:-4]
        if type_num==1:  # Interface Description Block
            if len(body)<8:raise CaptureError('PCAPNG truncated interface description')
            linktype,_,snaplen=struct.unpack_from(endian+'HHI',body,0)
            if linktype not in (1,12,101) or snaplen<64 or snaplen>MAX_PACKET:
                raise CaptureError('Unsupported PCAPNG network interface')
            links.append((linktype,snaplen))
            continue
        if type_num==6:  # Enhanced Packet Block
            if len(body)<20:raise CaptureError('PCAPNG truncated enhanced packet')
            interface,_,_,captured,original=struct.unpack_from(endian+'IIIII',body,0)
            if interface>=len(links):raise CaptureError('PCAPNG packet refers to unknown interface')
            linktype,snaplen=links[interface]
            if captured>original or captured>snaplen or captured>MAX_PACKET:
                raise CaptureError('PCAPNG packet length invalid')
            padding=(captured+3)&~3
            if 20+padding>len(body):raise CaptureError('PCAPNG packet payload truncated')
            frame=body[20:20+captured]
        elif type_num==3:  # Simple Packet Block
            if len(body)<4 or len(links)!=1:raise CaptureError('PCAPNG simple packet interface ambiguous')
            original=struct.unpack_from(endian+'I',body,0)[0]
            linktype,snaplen=links[0]
            captured=min(original,snaplen)
            if captured>len(body)-4:raise CaptureError('PCAPNG simple packet truncated')
            frame=body[4:4+captured]
        else:
            continue
        packet+=1
        payload=udp_payload(frame,linktype)
        if payload is None:continue
        if packet_observer is not None:packet_observer(payload)
        for trade in (filtered_trades(payload,symbol_filter,include_breaks) if symbol_filter is not None else trades_from_payload(payload)):
            yield packet,trade
