# CI/CD Pipeline Documentation

This project uses GitHub Actions for continuous integration and deployment with support for PR previews. The system is built on an artifact-based architecture for reliability and maintainability.

## 🏗️ Architecture Overview

The CI/CD pipeline uses GitHub Pages with the following structure:
```
GitHub Pages (gh-pages branch):
├── / (main site - from main branch)
└── previews/
    ├── pr-123/ (PR preview)
    ├── pr-456/ (PR preview)
    └── index.html (preview listing)
```

## 📋 Workflows

### 1. Main Deployment (`ghp-deploy-main.yml`)

**Triggers:**
- Push to `main` branch
- Scheduled daily (every day at midnight UTC)
- Manual workflow dispatch

**Actions:**
- Builds the project using Bun
- Processes data using the data processor
- Preserves existing PR previews
- Deploys to GitHub Pages root

### 2. PR Preview (`ghp-deploy-pr.yml`)

**Triggers:**
- Pull request opened, updated, or reopened against `main` branch

**Actions:**
- Builds the project for the PR
- Deploys to `/previews/pr-{number}/` path
- Preserves existing site and other previews
- Posts preview URL as PR comment

**Preview URLs:**
- Individual PR: `https://{username}.github.io/{repo}/previews/pr-{number}/`
- All previews: `https://{username}.github.io/{repo}/previews/`

### 3. Preview Cleanup (`ghp-clean-pr-closed.yml`)

**Triggers:**
- Pull request closed

**Actions:**
- Removes the specific PR preview directory
- Preserves main site and other previews
- Only deploys if cleanup was actually performed
- Updates PR comment to indicate cleanup

### 4. Test Build (`test-build.yml`)

**Triggers:**
- Manual trigger via workflow dispatch

**Actions:**
- Runs a test build to verify the build process
- Useful for debugging build issues

## 🔧 Scripts

The system uses reusable bash scripts for DRY (Don't Repeat Yourself) implementation:

- **`.github/scripts/get-latest-run-id.sh`** - Finds the most recent completed GitHub Pages deployment run across all workflows
- **`.github/scripts/prepare-deployment.sh`** - Unified deployment preparation for main and PR modes
- **`.github/scripts/extract-existing-site.sh`** - Standardized artifact extraction across all workflows
- **`.github/scripts/cleanup-specific-preview.sh`** - Handles cleanup of specific PR previews
- **`.github/scripts/generate-previews-index.sh`** - Generates HTML index page for preview listings

## 🚀 Setup Requirements

### GitHub Repository Settings

1. **GitHub Pages Configuration:**
   - Go to repository Settings → Pages
   - Set source to "GitHub Actions"
   - The system uses a single `gh-pages` branch with main site at root and previews in `/previews/`

2. **Branch Protection (Optional but Recommended):**
   - Protect the `main` branch
   - Require PR reviews before merging
   - Require status checks to pass

### Required Permissions

The workflows require the following permissions (automatically configured):
- `contents: read` - To read repository content
- `pages: write` - To deploy to GitHub Pages
- `pull-requests: write` - To comment on PRs
- `id-token: write` - For GitHub Pages deployment

## 🔄 How It Works

### Artifact-Based Deployment Strategy

The system uses a sophisticated artifact-based approach to manage GitHub Pages deployments:

1. **Artifact Discovery**: The `get-latest-run-id.sh` script automatically finds the most recent completed deployment across all workflows (`ghp-deploy-main`, `ghp-deploy-pr`, `ghp-clean-pr-closed`)

2. **Site Preservation**: Before any deployment, the current GitHub Pages content is downloaded as an artifact and extracted using `extract-existing-site.sh`

3. **Selective Updates**: Each workflow only modifies its specific area (main site or specific PR preview) while preserving all other content

4. **Conditional Deployment**: Workflows only trigger actual deployments when changes are detected, preventing unnecessary GitHub Pages updates

### PR Preview Workflow
1. **When a PR is opened or updated:**
   - Downloads existing GitHub Pages artifact using latest run ID
   - Extracts current site content
   - Builds PR changes
   - Deploys to `/previews/pr-{number}/` while preserving main site
   - Posts/updates PR comment with preview URL

2. **When a PR is closed:**
   - Downloads existing site
   - Removes only the specific PR preview directory
   - Redeploys without the removed preview
   - Updates PR comment to indicate cleanup

### Main Site Deployment
1. **When main branch is updated:**
   - Downloads existing site artifact using latest run ID
   - Builds new main site
   - Preserves all existing PR previews
   - Deploys updated main site to root

## 🛠️ Manual Operations

### Test a Build
```bash
# Trigger test build workflow
gh workflow run test-build.yml

# Trigger main deployment workflow manually
gh workflow run ghp-deploy-main.yml
```

### View Workflow Status
```bash
# List recent workflow runs
gh run list

# View specific run details
gh run view {run-id}
```

### Local Testing
```bash
# Install dependencies
bun install

# Run data processor
bun run ./src/data_processor.ts

# Build project
bun build ./index.html --outdir=./dist

# Check output
ls -la dist/
```

## 🔍 Troubleshooting

### Common Issues

1. **Build fails on data processing:**
   - Check if data sources are accessible
   - Verify data processor script works locally
   - Check workflow logs in Actions tab

2. **Preview not updating:**
   - GitHub Pages can take 5-10 minutes to propagate
   - Verify workflow completed successfully
   - Check if artifact was properly uploaded

3. **Missing preview comment:**
   - Ensure workflow has `pull-requests: write` permission
   - Verify PR is against `main` branch
   - Check for errors in comment posting step

### Debug Steps

1. **Check workflow logs:**
   - Go to Actions tab in GitHub repository
   - Look for failed steps and error messages
   - Check artifact upload/download steps

2. **Verify build artifacts:**
   - Check "Upload artifact" step succeeded
   - Ensure `dist/` directory contains expected files
   - Verify deployment directory structure

3. **Test scripts locally:**
   ```bash
   # Test latest run ID script (requires GitHub CLI and GITHUB_REPOSITORY env var)
   export GITHUB_REPOSITORY="owner/repo"
   export GITHUB_OUTPUT="/tmp/test_output"
   ./.github/scripts/get-latest-run-id.sh
   
   # Test extraction script
   ./.github/scripts/extract-existing-site.sh ./test-artifact/ ./test-output/
   
   # Test deployment preparation
   ./.github/scripts/prepare-deployment.sh main "" ./test-site/
   ```

## 🔒 Security Notes

- Workflows only trigger on PRs against `main` branch
- Preview deployments are isolated in separate directories
- No sensitive data should be exposed in build artifacts
- Artifact-based approach prevents direct git manipulation
- Each workflow step has minimal required permissions

## 🎯 Key Benefits

- **Reliability**: Artifact-based deployment prevents conflicts
- **Maintainability**: DRY implementation with reusable scripts eliminates code duplication
- **Efficiency**: Conditional deployments only when changes occur
- **Isolation**: PR previews don't interfere with main site
- **Cleanup**: Automatic removal when PRs are closed
- **Consistency**: Common script ensures identical artifact discovery logic across all workflows
- **Debugging**: Centralized run ID detection makes troubleshooting easier
