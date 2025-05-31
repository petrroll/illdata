#!/bin/bash

# Get run ID of latest workflow that deployed to GitHub Pages
# This script finds the most recent completed run across all GitHub Pages deployment workflows
# Usage: ./get-latest-run-id.sh

set -e

OTHER_REPO="${GITHUB_REPOSITORY}"
WF_NAMES=("ghp-deploy-main" "ghp-deploy-pr" "ghp-clean-pr-closed")
ALL_RUNS="[]"

echo "🔍 Finding latest GitHub Pages deployment run..."

for WF_NAME in "${WF_NAMES[@]}"; do
  echo "Checking workflow: ${WF_NAME}"
  WF_RUNS=$(gh run --repo "${OTHER_REPO}" list --workflow "${WF_NAME}" --json databaseId,status,conclusion,startedAt,workflowName,displayTitle,number --jq '[.[] | select(.status == "completed" and .conclusion == "success")]')
  ALL_RUNS=$(echo "${ALL_RUNS}" "${WF_RUNS}" | jq -s 'add')
done

RUN_MAIN=$(echo "${ALL_RUNS}" | jq 'sort_by(.startedAt) | reverse | .[0]')
RUN_ID=$(echo "$RUN_MAIN" | jq -r '.databaseId')
RUN_DATE=$(echo "$RUN_MAIN" | jq -r '.startedAt')
RUN_WORKFLOW_NAME=$(echo "$RUN_MAIN" | jq -r '.workflowName')

echo "✅ Detected latest run id of ${RUN_ID} at ${RUN_DATE} for workflow ${RUN_WORKFLOW_NAME}"
echo "Run details: ${RUN_MAIN}"
echo "run-id=${RUN_ID}" >> "$GITHUB_OUTPUT"
