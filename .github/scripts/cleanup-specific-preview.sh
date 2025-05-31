#!/bin/bash

# Cleanup specific PR preview
# Usage: ./cleanup-specific-preview.sh <pr-number> <existing-site-path>

set -e

PR_NUMBER="$1"
EXISTING_SITE_PATH="$2"

echo "=== Cleaning up PR #$PR_NUMBER preview ==="

if [ -z "$PR_NUMBER" ]; then
    echo "❌ Error: PR number is required"
    exit 1
fi

if [ -z "$EXISTING_SITE_PATH" ] || [ ! -d "$EXISTING_SITE_PATH" ]; then
    echo "ℹ No existing site found, nothing to cleanup"
fi

PREVIEW_PATH="$EXISTING_SITE_PATH/previews/pr-$PR_NUMBER"

echo "Looking for preview at: $PREVIEW_PATH"

if [ -d "$PREVIEW_PATH" ]; then
    echo "✓ Found preview directory for PR #$PR_NUMBER, removing..."
    rm -rf "$PREVIEW_PATH"
    echo "✓ Removed preview for PR #$PR_NUMBER"
    echo "CLEANUP_PERFORMED=true" >> $GITHUB_OUTPUT
else
    echo "ℹ No preview found for PR #$PR_NUMBER, nothing to cleanup"
    echo "CLEANUP_PERFORMED=false" >> $GITHUB_OUTPUT
fi

# Always set up deployment directory to ensure artifact can be uploaded
mkdir -p ./deployment
if [ -d "$EXISTING_SITE_PATH" ]; then
    cp -r "$EXISTING_SITE_PATH"/* ./deployment/
    echo "✓ Prepared deployment directory with existing site"
else
    echo "ℹ No existing site to copy, created empty deployment directory"
fi

echo "=== PR preview cleanup complete ==="
