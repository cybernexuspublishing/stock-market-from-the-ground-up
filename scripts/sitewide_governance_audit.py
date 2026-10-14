#!/usr/bin/env python3
"""Read-only development/production-boundary checks. No network, SQL, or file writes."""
from __future__ import annotations

import argparse
import json
import csv
import hashlib
import re
import sys
from pathlib import Path

REQUIRED = (
    'AGENTS.md',
    'PROJECT_SITEWIDE_RULES.md',
    'PROJECT_ADVANCED_ENGINEERING_RULES.md',
    'docs/sitewide/SOURCE_MASTER_WEBSITE_REQUIREMENTS.md',
    'docs/sitewide/SOURCE_ADVANCED_FORUM_REQUIREMENTS.md',
    'docs/sitewide/REQUIREMENTS_REGISTER.csv',
)
SOURCE_FILES = {
    'MASTER': 'docs/sitewide/SOURCE_MASTER_WEBSITE_REQUIREMENTS.md',
    'ADVANCED': 'docs/sitewide/SOURCE_ADVANCED_FORUM_REQUIREMENTS.md',
}
SECURITY_FILES = ('scripts/build-pages.sh', 'assets/js/route-policy.js', 'sw.js')
PRIVATE_SOURCE = (
    'data/interactive-labs.json',
    'public/data/interactive-labs.json',
    'public/supabase',
    'public/functions',
)


def audit(root: Path) -> tuple[list[str], list[str], list[str]]:
    errors, warnings, passes = [], [], []
    for rel in REQUIRED:
        path = root / rel
        if not path.is_file() or path.stat().st_size == 0:
            errors.append('Required rule source missing/empty: ' + rel)
        else:
            passes.append('Present: ' + rel)
    if errors:
        return errors, warnings, passes

    with (root / 'docs/sitewide/REQUIREMENTS_REGISTER.csv').open(encoding='utf-8-sig', newline='') as f:
        records = list(csv.DictReader(f))
    if len(records) < 350:
        errors.append(f'Requirements register appears truncated ({len(records)} rows)')
    else:
        passes.append(f'Requirements register retained {len(records)} indexed items')

    for source, rel in SOURCE_FILES.items():
        text = (root / rel).read_text(encoding='utf-8')
        lines = text.splitlines()
        expected = 1000 if source == 'ADVANCED' else 2200
        if len(lines) < expected:
            errors.append(f'{source} full source truncated ({len(lines)} lines)')
        else:
            passes.append(f'{source} full source present ({len(lines)} lines)')
        related = [r for r in records if r.get('source') == source]
        if not related:
            errors.append(f'{source} has no traceability records')
        for r in related:
            try:
                line = int(r['source_line'])
                if not 1 <= line <= len(lines) or r['requirement'] != lines[line - 1].strip():
                    errors.append('Register mismatch: ' + r.get('id', '?'))
                    break
            except (KeyError, ValueError):
                errors.append('Invalid requirement index: ' + r.get('id', '?'))
                break
        else:
            passes.append(f'{source} source line mapping consistent ({len(related)} entries)')

    if (root / 'data/interactive-labs.json').exists():
        errors.append('Private data/interactive-labs.json is present in source tree: build MUST NOT publish')
    else:
        passes.append('Private authored interactive-labs.json absent from repository root')
    for rel in PRIVATE_SOURCE[1:]:
        if (root / rel).exists():
            errors.append('Private content is inside public output: ' + rel)

    for rel in SECURITY_FILES:
        p = root / rel
        if not p.is_file():
            warnings.append('Security boundary could not be verified (file missing): ' + rel)
    builder = root / 'scripts/build-pages.sh'
    if builder.exists():
        data = builder.read_text(encoding='utf-8', errors='replace')
        if 'interactive-labs.json' not in data:
            errors.append('Pages builder does not explicitly guard private interactive-labs.json')
        for command in data.splitlines():
            stripped = command.strip()
            if stripped.startswith(('cp -R ', 'cp -r ', 'cp --recursive ')) and re.search(r'(?<![\w])data(?:/|\s|\$|[\"\'])', stripped):
                warnings.append('Review recursive public data copy: ' + stripped[:120])
    route = root / 'assets/js/route-policy.js'
    if route.exists() and 'isProtected' not in route.read_text(errors='replace'):
        warnings.append('Current route policy does not expose an explicit isProtected gate')
    worker = root / 'sw.js'
    if worker.exists():
        text = worker.read_text(errors='replace')
        if 'POLICY.isProtected' not in text or "cache:'no-store'" not in text:
            warnings.append('Service worker private-route no-store protection requires manual review')

    catalog = root / 'lab-catalog.json'
    if catalog.is_file():
        try:
            document = json.loads(catalog.read_text(encoding='utf-8'))
            ids = [str(x.get('lab_id')) for x in document.get('labs', []) if isinstance(x, dict)]
            if len(ids) != 419 or len(set(ids)) != 419:
                errors.append(f'Historical Lab catalog integrity: expected 419 unique lab IDs, got {len(ids)} items / {len(set(ids))} unique IDs')
            else:
                passes.append('Historical Lab catalog preserves 419 unique identifiers')
        except (json.JSONDecodeError, OSError, TypeError) as exc:
            errors.append('Historical Lab catalog could not be validated: ' + str(exc))
    else:
        warnings.append('Historical Lab registry not found locally; 419-ID check blocked')

    public_config = root / 'config.js'
    if public_config.is_file():
        config = public_config.read_text(encoding='utf-8', errors='replace')
        # Only secret examples with literal assignments are actionable in this static check.
        # Supabase's public publishable/anon keys are intentionally not classified as secrets.
        if re.search(r'(?i)(?:SUPABASE_SECRET_KEY|SERVICE_ROLE_KEY|LEMON_SQUEEZY_API_KEY)\s*[:=]\s*[\"\'](?!(?:REDACTED|SET_ME|placeholder))[^\"\']{8,}[\"\']', config):
            errors.append('Potential privileged credential hardcoded inside public config.js')
        else:
            passes.append('No literal recognized service-role/secret assignment found in public config.js (heuristic)')

    if (root / 'PROJECT_MANIFEST.json').exists():
        version_match = re.search(r'"version"\s*:\s*"([^\"]+)"', (root / 'PROJECT_MANIFEST.json').read_text(errors='replace'))
        if version_match:
            passes.append('Manifest reports version ' + version_match.group(1))
            if version_match.group(1) == '0.14.0.16':
                warnings.append('Manifest still reports 0.14.0.16; verify against live GitHub main and deployment before tagging')
    else:
        warnings.append('Manifest missing: unable to establish deployed revision')

    if not errors:
        passes.append('Governance documents and structural checks passed (NOT a production security certification)')
    return errors, warnings, passes


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root', default='.', type=Path, help='GitHub repository root after overlay is extracted')
    args = ap.parse_args()
    root = args.root.resolve()
    errors, warnings, passes = audit(root)
    for line in passes:
        print('PASS: ' + line)
    for line in warnings:
        print('WARN: ' + line)
    for line in errors:
        print('FAIL: ' + line)
    print(f'Result: {len(passes)} passes; {len(warnings)} warnings; {len(errors)} errors')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
