#!/usr/bin/env python3
"""Test-only binary PCAPNG+IEX-TP fixtures; NEVER genuine historical market evidence."""
import io,struct,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts/market-data'))
from pcapng_iex_reader import stream_pcapng
from iex_tops import CaptureError

def block(t,body):
    data=body+b'\x00'*((-len(body))%4)
    size=12+len(data)
    return struct.pack('<II',t,size)+data+struct.pack('<I',size)
def fake_capture():
    shb=block(0x0A0D0D0A,struct.pack('<IHHq',0x1A2B3C4D,1,0,-1))
    idb=block(1,struct.pack('<HHI',1,0,65535))
    trade=bytearray(38)
    trade[0]=0x54
    struct.pack_into('<q',trade,2,1715092200000000000)
    trade[10:18]=b'DIS     '
    struct.pack_into('<I',trade,18,50)
    struct.pack_into('<q',trade,22,1065300)
    struct.pack_into('<q',trade,30,9)
    message=struct.pack('<H',len(trade))+trade
    wire=bytearray(40)+message
    wire[0]=1
    struct.pack_into('<HH',wire,12,len(message),1)
    ip=bytearray(20);ip[0]=0x45;ip[9]=17
    udp=bytearray(8);struct.pack_into('!H',udp,4,8+len(wire))
    frame=b'\x00'*12+b'\x08\x00'+bytes(ip)+bytes(udp)+bytes(wire)
    epb=block(6,struct.pack('<IIIII',0,0,0,len(frame),len(frame))+frame)
    return shb,idb,epb
class StrictPCAPNG(unittest.TestCase):
    def test_valid_trade_report(self):
        a,b,c=fake_capture()
        trades=list(stream_pcapng(io.BytesIO(a+b+c)))
        self.assertEqual(len(trades),1)
        self.assertEqual(trades[0][1][1],'DIS')
        self.assertEqual(trades[0][1][2],50)
        self.assertEqual(trades[0][1][3],1065300)
    def test_bad_trailer_rejected(self):
        a,b,c=fake_capture()
        with self.assertRaises(CaptureError):
            list(stream_pcapng(io.BytesIO(a+b+c[:-4]+b'\x00'*4)))
    def test_bad_interface_reference_rejected(self):
        a,b,c=fake_capture()
        byte=bytearray(c);struct.pack_into('<I',byte,8,7)
        with self.assertRaises(CaptureError):
            list(stream_pcapng(io.BytesIO(a+b+byte)))
    def test_truncated_block_rejected(self):
        a,b,c=fake_capture()
        with self.assertRaises(CaptureError):
            list(stream_pcapng(io.BytesIO(a+b+c[:-6])))
    def test_missing_section_rejected(self):
        _,b,c=fake_capture()
        with self.assertRaises(CaptureError):
            list(stream_pcapng(io.BytesIO(b+c)))
if __name__=='__main__':unittest.main()
