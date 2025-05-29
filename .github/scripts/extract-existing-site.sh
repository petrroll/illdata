#!/bin/bash

# Extract existing site artifact if available
# Usage: ./extract-existing-site.sh <artifact-path> <extract-path>
# Sets EXISTING_SITE_PATH environment variable

set -e

ARTIFACT_PATH="${1:-./existing-site/}"
EXTRACT_PATH="${2:-./existing-site-extracted/}"

echo "=== Extracting existing site if available ==="
echo "Artifact path: $ARTIFACT_PATH"
echo "Extract path: $EXTRACT_PATH"

if [ -f "${ARTIFACT_PATH}/artifact.tar" ]; then
    echo "✓ Found existing site artifact, extracting..."
    
    # Create extraction directory
    mkdir -p "$EXTRACT_PATH"
    
    # Extract the tar file
    cd "$EXTRACT_PATH"
    tar -xf "../${ARTIFACT_PATH}/artifact.tar"
    cd - > /dev/null
    
    # Set the environment variable for the extracted path
    echo "EXISTING_SITE_PATH=$EXTRACT_PATH" >> $GITHUB_ENV
    echo "✓ Extracted existing site to: $EXTRACT_PATH"
    
    # Show some info about what was extracted
    if [ -d "$EXTRACT_PATH" ]; then
        echo "Extracted contents:"
        ls -la "$EXTRACT_PATH" | head -10
        if [ $(ls -1 "$EXTRACT_PATH" | wc -l) -gt 10 ]; then
            echo "... (and more files)"
        fi
    fi
else
    echo "ℹ No existing site artifact found at ${ARTIFACT_PATH}/artifact.tar"
    echo "EXISTING_SITE_PATH=" >> $GITHUB_ENV
fi

echo "=== Existing site extraction complete ==="
