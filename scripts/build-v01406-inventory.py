#!/usr/bin/env python3
"""Offline inventory of 77 commitments and public Lab metadata; contains NO member PII or answer keys."""
import csv,re,json
from pathlib import Path
root=Path(__file__).resolve().parents[1];docs=root/'docs'
src=(docs/'v0.14.0.5_ORDERED_MASTER_EXECUTION_PLAN.md').read_text(encoding='utf8')
rows=re.findall(r'^([0-9]{2})\.\s+\*\*(.*?)\*\*\s*(.*)$',src,re.M)
assert len(rows)==77 and [int(x[0]) for x in rows]==list(range(1,78))
with (docs/'v0.14.0.6_77_TASK_VERIFICATION_REGISTER.csv').open('w',newline='',encoding='utf8') as f:
 w=csv.writer(f);w.writerow(['task','requirement','specified_acceptance_and_dependencies','documented_previous_status','v0.14.0.6_verified_complete','next_verification_needed'])
 for task,title,rest in rows:
  parts=re.findall(r'\*\*([^*]+)\*\*\s*\.?\s*$',rest)
  prior=parts[-1] if parts else 'Not verified'
  summary=re.sub(r'\s*\*\*[^*]+\*\*\s*\.?\s*$','',rest).strip()
  if task in ('13','14','15'):
   nextstep='Additional handlers hardened locally; continue route-by-route endpoint/RLS review and staging account abuse tests.'
  elif int(task) in (6,7,8,9,10,66,67,68,69,70,73,74,76,77):
   nextstep='Requires production/provider/Owner/legal or external evidence; offline repository cannot establish completion.'
  elif int(task) in (31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47):
   nextstep='Requires private reviewed keys and/or verified/licensed historical replay plus trusted grader acceptance.'
  elif int(task) in (62,63):
   nextstep='Requires actual isolated client tenancy, domain proofs, storage, publishing and cross-tenant security tests.'
  else:
   nextstep='Source may contain partial implementation; verify required API/data path and role-based staging acceptance.'
  w.writerow([task,title,summary,prior,'NO',nextstep])
a=json.loads((root/'lab-catalog.json').read_text(encoding='utf8'))['labs']
assert len(a)==419 and len({r['lab_id'] for r in a})==419
with (docs/'v0.14.0.6_LAB_PUBLIC_METADATA_INVENTORY.csv').open('w',newline='',encoding='utf8') as f:
 w=csv.writer(f);w.writerow(['lab_id','book_code','chapter','ticker','historical_date','timeframe','source_kind','catalog_questions_count','historical_data_licensed_verified','answer_key_independently_reviewed','grading_launch_status'])
 for x in a:
  m=x.get('metadata') or {};w.writerow([x['lab_id'],x['book_code'],x.get('chapter_number') or '',x.get('ticker') or '',x.get('historical_date') or '',x.get('timeframe') or '',m.get('source_kind') or '',len(m.get('questions') or []),'NOT VERIFIED BY REPOSITORY','PRIVATE REVIEW UNKNOWN','DO NOT REPRESENT AS VERIFIED'])
print('Wrote 77-task verifiability register, 419-lab public metadata and provenance inventory')
