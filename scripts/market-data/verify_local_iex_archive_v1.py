#!/usr/bin/env python3
"""Verify an original IEX HIST gzip file in place; never extract or publish bars.

Computes complete original compressed-file SHA-256 and streams the entire gzip
to verify end-of-stream/CRC, without writing the decompressed PCAP to disk.
This is source transport integrity, NOT independent market-trade verification.
"""
import argparse
from datetime import date
import gzip
import hashlib
import json
from pathlib import Path
import re
import sys

ARCHIVE = re.compile(
    r"^(?:data_feeds_(?P<prefix_date>\d{8})_)?"
    r"(?P<source_date>\d{8})_IEXTP1_TOPS1\.6\.pcap\.gz$", re.I)
SHA = re.compile(r"^[a-fA-F0-9]{64}$")
READ_BYTES = 8 * 1024 * 1024
MAGICS = {
    b"\x0a\x0d\x0d\x0a": "PCAPNG",
    b"\xd4\xc3\xb2\xa1": "PCAP (little-endian)",
    b"\xa1\xb2\xc3\xd4": "PCAP (big-endian)",
    b"\x4d\x3c\xb2\xa1": "PCAP (nanosecond, little-endian)",
    b"\xa1\xb2\x3c\x4d": "PCAP (nanosecond, big-endian)",
}


class IntegrityError(ValueError):
    pass


def verify(file: Path, day: str, expected_sha: str, expected_bytes: int | None = None):
    try:
        if date.fromisoformat(day).isoformat() != day:
            raise IntegrityError("Date must be YYYY-MM-DD")
    except (ValueError, TypeError) as exc:
        raise IntegrityError("Date must be a valid YYYY-MM-DD") from exc
    if not SHA.fullmatch(expected_sha):
        raise IntegrityError("Expected SHA-256 must be exactly 64 hexadecimal digits")
    match = ARCHIVE.fullmatch(file.name)
    target = day.replace("-", "")
    if not match or match.group("source_date") != target or (
        match.group("prefix_date") and match.group("prefix_date") != target
    ):
        raise IntegrityError("IEX filename, prefix date or requested date does not match")
    if not file.is_file():
        raise IntegrityError("Original archive not found at the supplied path")
    size = file.stat().st_size
    if expected_bytes is not None and size != expected_bytes:
        raise IntegrityError(
            f"Compressed byte count mismatch: actual={size}, catalog={expected_bytes}"
        )
    if size < 100:
        raise IntegrityError("Source file is implausibly small")
    digest = hashlib.sha256()
    counted = 0
    with file.open("rb") as original:
        while chunk := original.read(READ_BYTES):
            digest.update(chunk)
            counted += len(chunk)
    if counted != size:
        raise IntegrityError("File changed while hashing")
    actual = digest.hexdigest()
    if actual.lower() != expected_sha.lower():
        raise IntegrityError(
            f"SHA-256 does not match provided fingerprint: actual={actual}"
        )
    # Do not persist the decompressed file. Consuming to EOF checks gzip CRC/ISIZE.
    expanded = 0
    magic = None
    try:
        with gzip.open(file, "rb") as stream:
            first = stream.read(READ_BYTES)
            magic = MAGICS.get(first[:4])
            if magic is None:
                raise IntegrityError("Decompressed file does not begin with recognized PCAP/PCAPNG magic")
            expanded = len(first)
            while chunk := stream.read(READ_BYTES):
                expanded += len(chunk)
    except (OSError, EOFError, gzip.BadGzipFile) as exc:
        raise IntegrityError("Incomplete or corrupt compressed archive (gzip/CRC validation failed)") from exc
    # Reject if a second process modified the compressed original during validation.
    if file.stat().st_size != size:
        raise IntegrityError("Original archive size changed during validation")
    return {
        "schema": "groundup.iex_local_archive_integrity.v1",
        "source_filename": file.name,
        "trading_date_et": day,
        "feed": "IEX TOPS 1.6",
        "compressed_bytes": size,
        "compressed_sha256": actual,
        "expected_sha256_matched": True,
        "expected_official_content_length_matched": expected_bytes is not None,
        "decompressed_bytes_streamed": expanded,
        "capture_format": magic,
        "full_gzip_stream_crc_checked": True,
        "source_obtained_on_owner_machine": True,
        "trade_conditions_reviewed": False,
        "packet_sequence_reviewed": False,
        "independent_trade_data_verified": False,
        "licensed_for_member_display": False,
        "member_publication_approved": False,
        "status": "LOCAL_ARCHIVE_INTEGRITY_VERIFIED_NOT_APPROVED_FOR_PUBLICATION",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=Path, required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--sha256", required=True, help="SHA-256 previously calculated with Get-FileHash")
    parser.add_argument("--expected-bytes", type=int, help="Official catalog's exact compressed byte count")
    parser.add_argument("--report", type=Path, help="Private JSON report; no raw market data in report")
    args = parser.parse_args(argv)
    try:
        result = verify(args.file, args.date, args.sha256, args.expected_bytes)
        if args.report is not None:
            if any(part.lower() in {"assets", "public", "functions", "docs", ".github"} for part in args.report.parts):
                raise IntegrityError("Refusing to write an integrity report to public website paths")
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps(result, indent=2, sort_keys=True))
    except (IntegrityError, OSError, ValueError) as exc:
        print("NOT VERIFIED: " + str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
