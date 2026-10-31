#!/usr/bin/env python3
"""Reconcile manually observed public URLs offline; no network requests."""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent
FIELDS = ("kind", "canonical_url", "title", "record_ids", "statuses", "provenance", "transcript_verified")


def canonical(url):
    p = urlsplit(url.strip())
    host = (p.hostname or "").lower()
    if host in {"youtube.com", "www.youtube.com", "m.youtube.com"} and p.path == "/watch":
        video_id = parse_qs(p.query).get("v", [""])[0]
        return "https://www.youtube.com/watch?v=" + video_id if video_id else url
    if host in {"stockstotrade.com", "www.stockstotrade.com"}:
        return "https://stockstotrade.com" + (p.path.rstrip("/") or "") + "/"
    return url


def reconcile(output):
    sources = (("source_registry_v1.csv", "id", "review_status"),
               ("discovered_batch_002.csv", "source_id", "access_status"),
               ("discovered_batch_003.csv", "id", "access_evidence"))
    items = {}
    input_counts = Counter()
    for filename, id_field, status_field in sources:
        with (ROOT / filename).open(newline="", encoding="utf-8-sig") as stream:
            for line, row in enumerate(csv.DictReader(stream), 2):
                kind = "youtube" if (row.get("kind") == "youtube" or row[id_field].startswith(("YT-", "STT-Y"))) else "website"
                url = canonical(row.get("url") or row.get("canonical_url"))
                expected = "https://www.youtube.com/watch?v=" if kind == "youtube" else "https://stockstotrade.com/"
                if not url.startswith(expected):
                    raise ValueError(f"Unexpected URL at {filename}:{line}: {url}")
                input_counts[kind] += 1
                item = items.setdefault((kind, url), {"kind": kind, "canonical_url": url,
                    "title": row["title"], "record_ids": set(), "statuses": set(),
                    "provenance": set(), "transcript_verified": False})
                item["record_ids"].add(row[id_field])
                item["statuses"].add(row[status_field])
                item["provenance"].add(f"{filename}:{line}")
                item["transcript_verified"] |= row.get("transcript_verified", "false").lower() == "true"
    output.mkdir(parents=True, exist_ok=True)
    rows = []
    for item in sorted(items.values(), key=lambda r: (r["kind"], r["canonical_url"])):
        rows.append({key: ";".join(sorted(value)) if isinstance(value, set) else
                     str(value).lower() if isinstance(value, bool) else value
                     for key, value in item.items()})
    with (output / "public_source_inventory.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    counts = Counter(row["kind"] for row in rows)
    website_index_count = sum(row["canonical_url"] == "https://stockstotrade.com/blog/" for row in rows)
    report = {"method": "offline reconciliation of manually observed source records",
              "input_rows": dict(input_counts), "unique_urls": dict(counts),
              "website_blog_index_urls": website_index_count,
              "website_article_candidate_urls": counts["website"] - website_index_count,
              "duplicate_rows": sum(input_counts.values()) - len(rows),
              "youtube_transcripts_verified": sum(row["transcript_verified"] == "true" for row in rows if row["kind"] == "youtube"),
              "youtube_channel_upload_ownership_verified": False,
              "coverage": "partial; exhaustive site and channel enumeration unverified",
              "wbs_task_count": None,
              "wbs_note": "Source URLs are not research tasks; no canonical research WBS was found."}
    (output / "public_inventory_audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT)
    reconcile(parser.parse_args().output)
