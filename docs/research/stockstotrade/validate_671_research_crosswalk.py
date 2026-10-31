#!/usr/bin/env python3
"""Read-only evidence gates for all canonical STT research crosswalk rows."""
import csv, pathlib, sys
BASE=pathlib.Path(__file__).resolve().parent
def read(name):
    with (BASE/name).open(encoding="utf-8-sig",newline="") as f:
        return list(csv.DictReader(f))
def audit():
    labs=read("canonical_419_lab_source_candidates_v2.csv")
    days=read("canonical_academy_252_day_source_candidates_v3.csv")
    manifests=["source_registry_v1.csv","discovered_batch_002.csv","discovered_batch_003.csv","discovered_batch_004.csv","discovered_batch_005.csv","discovered_batch_006.csv","source_surfaces_expansion_2026-10-31.csv"]
    registered={}
    for name in manifests:
        for row in read(name):
            ident=row.get("source_id") or row.get("id")
            url=row.get("canonical_url") or row.get("url")
            if ident and url: registered[ident]=(url,name)
    issues=[]
    units=[("lab",x["lab_id"],x.get("source_id",""),x.get("editorial_status","")) for x in labs]
    units += [("day",x["canonical_day_key"],x.get("source_id",""),x.get("editorial_status","")) for x in days]
    for kind,key,source,status in units:
        if not source: issues.append((kind,key,"missing_source_candidate"))
        elif source not in registered: issues.append((kind,key,"source_id_not_in_manifests"))
        elif not registered[source][0].startswith("https://"): issues.append((kind,key,"source_not_https"))
    expected={"truth5":5,"watchlist7":7,"scanners10":10,"foundations30":30,"charts45":45,"risk60":60,"practicum90":90,"free5":5}
    for prog,n in expected.items():
        found={int(x["program_day"]) for x in days if x["program_code"]==prog}
        if found != set(range(1,n+1)): issues.append(("program",prog,"day_sequence_mismatch"))
    if len(labs)!=419 or len({x["lab_id"] for x in labs})!=419: issues.append(("catalog","labs","wrong_count_or_duplicate_ids"))
    if len(days)!=252 or len({x["canonical_day_key"] for x in days})!=252: issues.append(("catalog","days","wrong_count_or_duplicate_ids"))
    print("Units:",len(units),"Labs:",len(labs),"Days:",len(days),"Source IDs:",len(registered))
    print("Registry integrity exceptions:",len(issues))
    for issue in issues[:80]:print("EXCEPTION",*issue,sep=",")
    print("IMPORTANT: Zero instructional/editorial approvals conferred by this metadata test.")
    return 1 if issues else 0
if __name__=="__main__":sys.exit(audit())
