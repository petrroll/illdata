# illmeter

This project explores illness positivity rates across Europe—with a primary focus on Czechia—and delivers a single pane of glass dashboard for data visualization.

## Installing Dependencies

Install the required dependencies with:
```bash
bun install
```

## Running the Project

The project provides several tasks defined in the dev container:

- **Build**: Install dependencies and process data.
    ```bash
    bun run ./src/data_processor.ts
    ```
    
- **Launch**: Start the dashboard.
    ```bash
    bun run bunx vite
    ```

- **Test**: Run type checks and tests.
    ```bash
    bun run tsc --noEmit && bun test
    ```

## Data Exploration

An UV-managed Jupyter playground is available in `./playground` to explore the data retrieved by the data processor.
