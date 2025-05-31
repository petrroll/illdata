# Project Structure

This project processes and visualizes illness data (COVID, respiratory viruses) and consists of two main parts:

1. **Browser Visualization** (`/src`)
   - Main TypeScript application for data visualization
   - Uses Chart.js to render interactive time series graphs
   - Handles user preferences (time range, dataset visibility) via localStorage
   - Entry point: `src/main.ts` and `index.html`

2. **Data Processing** (`/src/data_processor.ts`)
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
- `index.html` - Browser visualisation HTML serving point that's manipulated by `src/main.ts`
- `src/main.ts` - Browser visualization entry point
- `src/utils.ts` - Shared utilities for data manipulation
- `src/data_processor.ts` - Data processing script that fetches and transforms data
- `data_processed/*.json` - Processed data consumed by visualization

## To run the project
The project uses [Bun](https://bun.sh/) as its runtime and package manager, which provides built-in TypeScript support and testing capabilities (no need for npx or jest). [Just](https://github.com/casey/just) is used as the command runner. Here are the available commands:

- **Build**: Install dependencies and process data.
    ```bash
    just build
    ```

- **Process Data**: Process the raw data files (also included in build).
    ```bash
    just process-data
    ```
    
- **Serve**: Start the dashboard (default command).
    ```bash
    just serve
    ```
    
    You can also run just the default command:
    ```bash
    just
    ```

- **Test**: Run type checks and tests.
    ```bash
    just test
    ```

## Guidelines

When contributing to this project, please follow these coding principles:

- **Keep It Simple (KISS)**: Prefer simple, readable code over complex solutions. Clear and straightforward implementations are easier to understand, maintain, and debug.
- **Don't Repeat Yourself (DRY)**: When it doesn't conflict with keeping the code simple, avoid duplication by extracting common functionality into reusable components or utilities.
