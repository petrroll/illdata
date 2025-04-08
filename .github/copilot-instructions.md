# Project Structure

This project processes and visualizes illness data (COVID, respiratory viruses) and consists of two main parts:

1. **Browser Visualization** (`/src`)
   - Main TypeScript application for data visualization
   - Uses Chart.js to render interactive time series graphs
   - Handles user preferences (time range, dataset visibility) via localStorage
   - Entry point: `src/main.ts` and `index.html`

2. **Data Processing** (`/data_processor`)
   - Runs during build or when new data needs to be processed
   - Processes raw data into JSON format consumed by the visualization
   - Outputs to `data_processed/` directory
   - Contains scripts for fetching and transforming data from various sources

## Additional Components

- **Python Environment** (`/playground`)
  - Separate environment for data exploration and analysis
  - Not part of the main application flow
  - Useful for prototyping new data processing approaches

## Key Files

- `src/main.ts` - Browser visualization entry point
- `src/utils.ts` - Shared utilities for data manipulation
- `data_processor/` - Data processing scripts
- `data_processed/*.json` - Processed data consumed by visualization
