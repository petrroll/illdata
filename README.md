# illmeter

This project explores illness positivity rates across Europe—with a primary focus on Czechia—and delivers a single pane of glass dashboard for data visualization.

> The project has been mostly written by copilot swe agent. The goal of this is to be a data dashboard first (and mostly (so far) just for me). While I initially tried to maintain some level of quality of the code, a lot of things slipped since (some of it was generated pre-claude 4.5 😅). Please don't take this as example of the quality of work I'd do in professional setting; different cost-benefit balance there.

## Installing Dependencies and Running the Project

The project uses [just](https://github.com/casey/just) as its command runner. Here are the available commands:

- **Build**: Install dependencies and process data.
    ```bash
    just build
    ```

- **Process Data**: Process the raw data files (also included in build).
    ```bash
    just process-data
    ```
    
- **Launch**: Start the dashboard (default command, runs build first).
    ```bash
    just launch
    ```

- **Test**: Run type checks and unit tests.
    ```bash
    just test
    ```

## End-to-End Testing

The project includes comprehensive Playwright tests covering all major features:

- **Run E2E tests**: Run all Playwright tests in headless mode.
    ```bash
    just test-e2e
    ```

- **Run E2E tests with UI**: Open Playwright's UI mode for debugging tests.
    ```bash
    just test-e2e-ui
    ```

- **Run E2E tests headed**: Run tests in headed mode (visible browser).
    ```bash
    just test-e2e-headed
    ```

- **Run all tests**: Run both unit and E2E tests.
    ```bash
    just test-all
    ```

### Test Coverage

The E2E test suite includes 60 tests covering:
- Language switching (English ↔ Czech)
- Individual series visibility toggling
- Category filters (shifted series, test numbers, extremes)
- Shift and alignment controls (days, maxima, minima)
- URL state management (link generation and restoration)
- LocalStorage persistence
- Combined scenarios and workflows

### Prerequisites for E2E Tests

On first run, you'll need to install Playwright browsers:
```bash
bunx playwright install chromium
```

## Data Exploration

An UV-managed Jupyter playground is available in `./playground` to explore the data retrieved by the data processor.
