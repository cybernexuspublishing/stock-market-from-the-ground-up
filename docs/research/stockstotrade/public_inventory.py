#!/usr/bin/env python3
"""Public URL/video discovery utility. Free, resumable, metadata only.
Requires optional pip packages: requests, beautifulsoup4, yt-dlp.
Do not use to evade restrictions; honor robots.txt and site terms.
No transcript text or copyrighted article bodies are retained.
"""
import argparse, csv, json, pathlib, time, urllib.parse, urllib.robotparser
from collections import deque

FIELDS = ["kind","url","title","date","status","source","error"]
def write_csv(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        w=csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(data)
def site_scan(args, output):
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError as e:
        raise SystemExit("Install optional free packages: pip install requests beautifulsoup4") from e
    origin="https://stockstotrade.com"
    base=urllib.parse.urlsplit(origin).netloc
    robots=urllib.robotparser.RobotFileParser()
    robots.set_url(origin+"/robots.txt")
    try:
        robots.read()
        robots_known=True
    except Exception:
        robots_known=False
    if not robots_known:
        raise SystemExit("robots.txt unavailable: stop automated crawl; use allowed manual/index methods")
    state=output/"site_state.json"
    if state.exists():
        s=json.loads(state.read_text())
        queue=deque(s["queue"]); seen=set(s["seen"]); rows=s["rows"]
    else:
        queue=deque([origin+"/",origin+"/blog/"]); seen=set(); rows=[]
    while queue and (args.limit==0 or len(seen)<args.limit):
        url=queue.popleft()
        if url in seen: continue
        seen.add(url)
        entry=dict(kind="web",url=url,title="",date="",status="unknown",source="internal_link",error="")
        if not robots.can_fetch("SMFGUResearchBot",url):
            entry["status"]="robots_disallowed"
        else:
            try:
                r=requests.get(url,timeout=20,headers={"User-Agent":"SMFGUResearchBot/1.0 (educational URL inventory)"})
                entry["status"]=str(r.status_code)
                if r.ok and "text/html" in r.headers.get("Content-Type",""):
                    soup=BeautifulSoup(r.text,"html.parser")
                    entry["title"]=soup.title.get_text(" ",strip=True) if soup.title else ""
                    tm=soup.find("meta",property="article:published_time")
                    if tm: entry["date"]=tm.get("content","")
                    for a in soup.find_all("a",href=True):
                        parsed=urllib.parse.urlsplit(urllib.parse.urljoin(url,a["href"]))
                        if parsed.scheme not in ("https","http") or parsed.netloc.lower()!=base: continue
                        nxt=urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path,"",""))
                        if nxt not in seen and nxt not in queue: queue.append(nxt)
            except Exception as e:
                entry["status"]="fetch_error"; entry["error"]=str(e)[:240]
            time.sleep(args.delay)
        rows.append(entry)
        state.write_text(json.dumps(dict(queue=list(queue),seen=sorted(seen),rows=rows),indent=2))
    write_csv(output/"website_discovery.csv",rows)
    print("web observed:",len(rows),"queued:",len(queue))
def youtube_scan(args,output):
    try:
        import yt_dlp
    except ImportError as e:
        raise SystemExit("Install optional free package: pip install yt-dlp") from e
    opts={"quiet":True,"extract_flat":True,"skip_download":True,"ignoreerrors":True}
    rows=[]
    with yt_dlp.YoutubeDL(opts) as y:
        for suffix in ("videos","shorts","streams"):
            target="https://www.youtube.com/@Stockstotrade/"+suffix
            try:
                data=y.extract_info(target,download=False)
                for e in (data or {}).get("entries",[]) or []:
                    if not e: continue
                    vid=e.get("id") or ""
                    if not vid: continue
                    rows.append(dict(kind="youtube",url="https://www.youtube.com/watch?v="+vid,
                       title=e.get("title") or "",date=str(e.get("upload_date") or ""),
                       status="metadata_only",source=target,error="No transcript assessed"))
            except Exception as e:
                rows.append(dict(kind="youtube",url=target,title="",date="",
                    status="discovery_error",source=target,error=str(e)[:240]))
    unique={row["url"]:row for row in rows}
    write_csv(output/"youtube_discovery.csv",list(unique.values()))
    print("video ids:",sum(r["status"]=="metadata_only" for r in unique.values()))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--mode",choices=["site","youtube","both"],default="both")
    p.add_argument("--output",default="research-output")
    p.add_argument("--limit",type=int,default=0,help="0 means no page-count cap")
    p.add_argument("--delay",type=float,default=1.5)
    a=p.parse_args(); out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True)
    if a.mode in ("site","both"):site_scan(a,out)
    if a.mode in ("youtube","both"):youtube_scan(a,out)
