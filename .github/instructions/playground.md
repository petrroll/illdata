---
applies_to:
  - "playground/**"
---

# Playground Environment Instructions

The `playground/` directory is a separate Python environment for data exploration and analysis using Jupyter notebooks.

## Key Differences from Main Project

- **Language**: Python (not TypeScript)
- **Package Manager**: UV (not Bun)
- **Purpose**: Data exploration and prototyping (not production code)
- **Not part of**: Main application build or CI/CD pipeline

## Setup

Use the provided Just command to set up the playground:
```bash
just setup-playground
```

This command will:
1. Run the main build to ensure data is available
2. Initialize UV environment
3. Source development environment variables

## Guidelines

- This is for experimentation - code here doesn't need the same rigor as main project
- Use Jupyter notebooks for interactive data exploration
- Don't add Python dependencies to the main project
- Changes here don't require tests or CI validation
- Processed data from main project is available for analysis
