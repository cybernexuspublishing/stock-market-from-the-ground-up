#!/usr/bin/env python3
"""Isolated self-tests for the read-only sitewide governance validator."""
from pathlib import Path
import importlib.util
import tempfile
import csv
import shutil

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sitewide_governance_audit', ROOT / 'scripts/sitewide_governance_audit.py')
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as d:
    x = Path(d)
    for rel in module.REQUIRED:
        dest = x / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        src = ROOT / rel
        if src.exists():
            shutil.copy2(src, dest)
        else:
            dest.write_text('Previously established repository rules', encoding='utf-8')
    (x / 'scripts').mkdir(exist_ok=True)
    (x / 'scripts/build-pages.sh').write_text('echo interactive-labs.json\n')
    errors, warnings, passes = module.audit(x)
    assert not errors, errors
    (x / 'data').mkdir()
    (x / 'data/interactive-labs.json').write_text('{"PRIVATE":true}')
    errors, warnings, passes = module.audit(x)
    assert any('Private data/' in e for e in errors), errors
    (x / 'data/interactive-labs.json').unlink()
    for row in csv.DictReader((x / 'docs/sitewide/REQUIREMENTS_REGISTER.csv').open(newline='')):
        first = row
        break
    files = {'MASTER': 'SOURCE_MASTER_WEBSITE_REQUIREMENTS.md', 'ADVANCED': 'SOURCE_ADVANCED_FORUM_REQUIREMENTS.md'}
    path = x / 'docs/sitewide' / files[first['source']]
    lines = path.read_text(encoding='utf-8').splitlines()
    lines[int(first['source_line']) - 1] = 'CHANGED REQUIREMENT'
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    errors, warnings, passes = module.audit(x)
    assert any('Register mismatch' in e for e in errors), errors
print('PASS: valid charter, private teaching file block, source/register tampering detection')
