"""v0.14.0.50: scoped, non-destructive ACL hardening source contracts."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/"supabase"
pre=(base/"admin/v0.14.0.50_ACL_PREFLIGHT_READ_ONLY.sql").read_text()
post=(base/"admin/v0.14.0.50_ACL_POSTFLIGHT_READ_ONLY.sql").read_text()
mig=(base/"migrations/v0.14.0.50_REVOKE_EXPOSED_TRUNCATE_TRIGGER_REVIEW_REQUIRED.sql").read_text()
expected={
 ("anon","forum_categories"),("anon","forum_posts"),("anon","forum_topics"),
 ("authenticated","forum_categories"),("authenticated","forum_posts"),("authenticated","forum_topics"),
 ("authenticated","decision_journal"),("authenticated","entitlements"),
 ("authenticated","lab_attempts"),("authenticated","lab_progress"),("authenticated","profiles")
}
def pairs(sql):
 return set(re.findall(r"\('(anon|authenticated)','([a-z_]+)'\)",sql))
assert pairs(pre)==expected, "Preflight must include exactly the 11 affected role/table pairs"
assert pairs(post)==expected, "Postflight must include exactly the 11 affected role/table pairs"
assert pairs(mig)==expected, "Migration guard must verify all 11 affected pairs"
for file in (pre,post):
 assert "BEGIN TRANSACTION READ ONLY;" in file
 assert "ROLLBACK;" in file
 assert "has_table_privilege(" in file
 assert "TRUNCATE" in file and "TRIGGER" in file
 assert "MISSING_TABLE" in file and "REVIEW_EXPOSED" in file
 assert not re.search(r"(?mi)^\s*(UPDATE|INSERT|DELETE|TRUNCATE|GRANT|REVOKE|ALTER|DROP)\s",file)
assert mig.count("REVOKE TRUNCATE, TRIGGER ON TABLE")==2
assert "FROM anon, authenticated;" in mig
assert "FROM authenticated;" in mig
assert "GU50_REVOKE_INCOMPLETE" in mig and "GU50_MISSING_REQUIRED_TARGET_TABLE" in mig
assert "COMMIT;" in mig
assert "SET LOCAL lock_timeout" in mig
assert not re.search(r"(?mi)^\s*(DROP|DELETE|UPDATE|INSERT|ALTER|GRANT|TRUNCATE)\s",mig)
assert all("public."+p in mig for p in [
 "forum_categories","forum_posts","forum_topics","decision_journal",
 "entitlements","lab_attempts","lab_progress","profiles"])
print("PASS v0.14.0.50: exactly 11 effective-privilege pairs / 22 checks, guarded minimal REVOKE, pre/post read-only.")
