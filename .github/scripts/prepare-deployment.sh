#!/bin/bash
# Script to prepare deployment directory with main site and existing previews
# Usage: prepare-deployment.sh [mode] [pr_number] [existing_site_path]
# Modes: main, pr

set -e

MODE=${1:-"main"}
PR_NUMBER=${2:-""}
EXISTING_SITE_PATH=${3:-""}

# Create deployment directory
mkdir -p deployment

case "$MODE" in
    "main")
        echo "Preparing main site deployment..."
        # Copy main site to deployment root
        cp -r dist/* deployment/
        
        # If existing site artifact was downloaded, preserve previews
        if [ -n "$EXISTING_SITE_PATH" ] && [ -d "$EXISTING_SITE_PATH" ]; then
            echo "Using existing site from: $EXISTING_SITE_PATH"
            
            # Copy existing previews
            if [ -d "$EXISTING_SITE_PATH/previews" ]; then
                echo "Copying existing previews..."
                cp -r "$EXISTING_SITE_PATH/previews" "deployment/"
                echo "Preserved existing previews"
            fi
        fi
        ;;
        
    "pr")
        if [ -z "$PR_NUMBER" ]; then
            echo "Error: PR number required for PR mode"
            exit 1
        fi
        
        echo "Preparing PR #$PR_NUMBER preview deployment..."
        
        # Create preview directory
        mkdir -p "deployment/previews/pr-$PR_NUMBER"
        cp -r dist/* "deployment/previews/pr-$PR_NUMBER/"
        
        # If existing site artifact was downloaded, preserve main site and other previews
        if [ -n "$EXISTING_SITE_PATH" ] && [ -d "$EXISTING_SITE_PATH" ]; then
            echo "Using existing site from: $EXISTING_SITE_PATH"
            
            # Copy existing main site content (everything except previews)
            for item in "$EXISTING_SITE_PATH"/*; do
                if [ -e "$item" ] && [ "$(basename "$item")" != "previews" ]; then
                    cp -r "$item" deployment/
                fi
            done
            
            # Copy existing previews (excluding current PR)
            if [ -d "$EXISTING_SITE_PATH/previews" ]; then
                echo "Copying existing previews..."
                for preview_dir in "$EXISTING_SITE_PATH/previews"/*; do
                    if [ -d "$preview_dir" ]; then
                        preview_name=$(basename "$preview_dir")
                        if [ "$preview_name" != "pr-$PR_NUMBER" ]; then
                            cp -r "$preview_dir" "deployment/previews/"
                            echo "Copied preview: $preview_name"
                        fi
                    fi
                done
            fi
        else
            exit 1  # We don't want to do any deployments if we couldn't download the existing site because we'd deploy empty in the main path
        fi
        
        # Generate updated previews index
        ./.github/scripts/generate-previews-index.sh "deployment/previews"
        ;;
        
    *)
        echo "Error: Unknown mode '$MODE'. Use: main or pr"
        exit 1
        ;;
esac

echo "Deployment preparation complete for mode: $MODE"
