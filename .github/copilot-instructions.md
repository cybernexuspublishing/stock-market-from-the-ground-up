# GitHub Copilot instructions — The Stock Market: From the Ground Up

Read and follow the repository's `AGENTS.md`, `PROJECT_SITEWIDE_RULES.md`, `PROJECT_ADVANCED_ENGINEERING_RULES.md`, and applicable source requirements before making changes. These documents retain their existing precedence; this file does not modify or replace Owner-approved decisions.

## Cloudflare platform integration

- The repository's `.mcp.json` configures the official Cloudflare API MCP endpoint, `https://mcp.cloudflare.com/mcp`. Before accessing Cloudflare account resources, complete user-approved OAuth authentication and select least-privilege scopes. Do not assume that the MCP server is authenticated merely because it is listed in configuration.
- Use the official Cloudflare Skills from `https://github.com/cloudflare/skills` when available. Agents with an installation-capable environment may install these skills through Cloudflare's documented setup process; do not claim installation without verifying the destination and installed files.
- Use Wrangler for existing configured Pages/Workers projects and Worker-specific development, preview and operational commands. Do not invent a Wrangler configuration for the static Pages repository. For general Cloudflare API operations, use the authenticated official Cloudflare API MCP server. The optional `cf` CLI is not a prerequisite.
- Inspect GitHub source, actual deployed Cloudflare bindings, environment configuration, routes, Workers/Pages topology, and relevant logs before recommending changes. The GitHub branch may not match the current production deployment.
- Keep production API endpoints and publicly accessible filenames **stable and unversioned**. Release package names may contain versions, but the version must not be embedded in a production URL, API endpoint, or runtime import path solely for release tracking.
- Never write Cloudflare tokens, Supabase service credentials, Stripe secrets, OAuth responses, or payment information to this public repository, prompts, logs, screenshots, client code, or tracked environment files.
- Preserve Cloudflare Pages/Workers and Supabase/PostgreSQL architecture unless an Owner-approved change justifies a migration. Do not disable security checks, mutate production billing or entitlements, or deploy to production without verifying the scope, test evidence, rollback plan, and applicable Owner approval.
- Treat Cloudflare MCP configuration, Cloudflare account OAuth authorization, locally installed skills, Cloudflare CLI installation, and confirmed production deployment as **separate** verifiable statuses.
