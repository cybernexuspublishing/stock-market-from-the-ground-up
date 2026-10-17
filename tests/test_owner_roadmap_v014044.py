#!/usr/bin/env python3
"""Read-only Owner roadmap v0.14.0.44 contract tests (stdlib only)."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


class OwnerRoadmapContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cat = read("functions/_lib/owner-roadmap-catalog.js")
        m = re.search(r"export const roadmapCatalog=(\[.*?\]);\nexport const roadmapMetadata=", cls.cat, re.S)
        assert m, "private catalog must export roadmapCatalog array"
        cls.rows = json.loads(m.group(1))
        cls.api = read("functions/api/owner-roadmap.js")
        cls.ui = read("assets/js/owner-roadmap.js")
        cls.page = read("owner-roadmap.html")
        cls.nav = read("assets/js/navigation.js")
        cls.policy = read("assets/js/route-policy.js")

    def test_no_source_requirement_omissions(self):
        ids = [row["id"] for row in self.rows]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(ids), 2096)
        self.assertEqual(sum(row["scope"] == "core" for row in self.rows), 281)
        self.assertEqual(sum(row["scope"] == "trace" for row in self.rows), 1815)
        self.assertEqual(sum(row["kind"] == "reference" for row in self.rows), 147)
        self.assertEqual(sum(i.startswith("EXEC-") for i in ids), 77)
        self.assertEqual(sum(i.startswith("PROM-") for i in ids), 38)
        for item in self.rows:
            self.assertTrue(item.get("title"))
            self.assertTrue(item.get("source"))
            self.assertIn(item.get("scope"), ("core", "trace"))

    def test_expected_workstreams(self):
        core = " ".join(row["title"].lower() for row in self.rows if row["scope"] == "core")
        for expected in ("stripe", "market commons", "showcase", "book key",
                         "simulator", "journal", "founding", "supabase",
                         "owner", "web solutions", "cloudflare", "kdp select",
                         "automation", "backup", "accessibility", "onboarding"):
            self.assertIn(expected, core, expected)

    def test_owner_required_at_backend(self):
        for evidence in ("auth/v1/user", "admin_user_roles", "roles.some",
                         "role_code==='OWNER'", "account_kind==='member'",
                         "admin_user_flags", "restricted", "suspended",
                         "REQUIRE_STAFF_AAL2_V135", "origin=request.headers",
                         "public_read:false", "site_settings",
                         "admin_audit_log", "x-robots-tag", "no-store"):
            self.assertIn(evidence, self.api)
        self.assertNotIn("window.localStorage", self.api)
        self.assertIn("return reply({ok:false,error:", self.api)

    def test_owner_dropdown_once_per_navigation_surface(self):
        self.assertEqual(self.nav.count("['Website Development Roadmap','/owner-roadmap.html']"), 1)
        self.assertEqual(self.nav.count("'<a href=\"/owner-roadmap.html\">Website Development Roadmap</a>'"), 1)
        self.assertIn("roles.includes('OWNER')", self.nav)
        self.assertIn("owner-roadmap", self.policy)
        self.assertRegex(self.policy, r"STAFF=\[[^\]]+'owner-roadmap'")

    def test_private_catalog_outside_pages_build(self):
        build = read("scripts/build-pages.sh")
        self.assertIn('cp -- ./*.html', build)
        self.assertIn('"$directory" "$output"/', build)
        self.assertNotIn("_lib", build)
        self.assertNotIn("functions/", build.split("for directory in assets learn")[1].split("done")[0])
        self.assertNotIn("role_code", self.ui)
        self.assertIn("/api/owner-roadmap", self.ui)

    def test_controls_auditing_and_unverified_default(self):
        for term in ("data-check", "data-status", "data-note", "or-export-csv",
                     "or-export-json", "or-search", "or-new-task", "not_started",
                     "verified", "owner_complete"):
            self.assertTrue(term in self.ui or term in self.page, term)
        self.assertIn("status:'not_started'", self.api)
        self.assertIn("owner_roadmap.", self.api)
        self.assertIn("auditLogged", self.api)
        self.assertIn("data-route-access=\"staff\"", self.page)
        self.assertIn('name="robots" content="noindex', self.page)
        self.assertIn("Owner / Super Admin", self.page)
        self.assertFalse((ROOT / "data" / "owner-roadmap-catalog.json").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
