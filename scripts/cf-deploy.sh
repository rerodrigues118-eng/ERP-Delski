#!/bin/sh
# Workaround for wrangler v4 workspace detection in monorepos.
# Wrangler v4 refuses to run `wrangler deploy` at the root of a workspace.
# This wrapper creates a temporary directory without workspace markers
# and runs wrangler deploy from there with proper assets configuration.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "🔧 Deploying from temp context to bypass workspace detection..."

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Copy wrangler config from repo root
cp "$REPO_ROOT/wrangler.json" "$TMPDIR/" 2>/dev/null || true

# Symlink the dist directory so wrangler can find the assets
ln -s "$REPO_ROOT/dist" "$TMPDIR/dist"

# Create a clean package.json (no workspace markers)
echo '{"name":"deploy-context","private":true}' > "$TMPDIR/package.json"

# Run wrangler deploy from the clean context
cd "$TMPDIR"
npx --yes wrangler@4 deploy
