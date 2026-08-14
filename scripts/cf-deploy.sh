#!/bin/sh
# Workaround for wrangler v4 workspace detection in monorepos.
# Wrangler v4 refuses to run `wrangler deploy` at the root of a workspace.
# This wrapper creates a temporary directory without workspace markers
# and runs the real wrangler from there.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Copy wrangler config
cp "$REPO_ROOT/wrangler.json" "$TMPDIR/" 2>/dev/null || true

# Symlink the dist directory
ln -s "$REPO_ROOT/dist" "$TMPDIR/dist"

# Create a minimal package.json (no workspaces field)
echo '{"name":"deploy-context","private":true}' > "$TMPDIR/package.json"

echo "🔧 Deploying from temp context to bypass workspace detection..."
cd "$TMPDIR"
npx --yes wrangler@4 "$@"
