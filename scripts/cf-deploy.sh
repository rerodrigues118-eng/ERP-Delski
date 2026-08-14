#!/bin/sh
# Workaround for wrangler v4 workspace detection in monorepos.
# Wrangler v4 refuses to run `wrangler deploy` at the root of a workspace.
# This wrapper intercepts the deploy command and uses `wrangler pages deploy`
# which is the correct command for Cloudflare Pages projects.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "🔧 Deploying from temp context to bypass workspace detection..."

# Use wrangler pages deploy with the dist directory from the repo root
# This avoids workspace detection entirely
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Create a clean context (no workspace markers)
echo '{"name":"deploy-context","private":true}' > "$TMPDIR/package.json"

cd "$TMPDIR"
npx --yes wrangler@4 pages deploy "$REPO_ROOT/dist" --project-name=erp-delski
