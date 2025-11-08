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

## Testing

The project uses **Bun** as its test runner with built-in TypeScript support:

- Test files use the `.test.ts` suffix (e.g., `utils.test.ts`)
- Tests are located alongside the source files they test in `src/`
- Run tests with: `just test` (runs type checking and unit tests)
- Run type checking only with: `just check-ts`
- All tests must pass before committing changes

### Unit Tests

Unit tests are located in `src/` alongside the code they test:
- 72 unit tests covering utilities, data processing, and core functionality
- Run with `bun test` (or `just test` which also runs TypeScript checks)
- Test files: `utils.test.ts`, `settings.test.ts`, `urlstate.test.ts`, etc.

### End-to-End Tests

E2E tests use **Playwright** and are located in `tests/`:
- 60 E2E tests covering all major user workflows
- Run with `bunx playwright test` (or `just test-e2e`)
- Test browsers in headless mode by default
- Playwright config: `playwright.config.ts`

**E2E Test Coverage:**
- Language switching (EN ↔ CS)
- Series visibility toggling
- Category filters (shifted series, test numbers, extremes)
- Shift and alignment controls
- URL state management (shareable links)
- LocalStorage persistence

**Commands:**
- `just test-e2e` - Run all E2E tests headless
- `just test-e2e-ui` - Open Playwright UI for debugging
- `just test-e2e-headed` - Run tests in visible browser
- `just test-all` - Run both unit and E2E tests

**First-time setup:**
```bash
bunx playwright install chromium
```

### Testing Best Practices
- Write tests for new functionality
- Follow the existing test structure and patterns
- Use descriptive test names that explain what's being tested
- Test edge cases and error conditions
- Unit tests for utilities and data processing
- E2E tests for user workflows and UI interactions

## TypeScript Configuration

The project uses strict TypeScript settings:
- Strict mode enabled for type safety
- Target: ESNext with DOM support
- Module resolution: bundler mode (for Bun)
- No emit mode (Bun handles transpilation)
- Type checking is part of the test suite

## CI/CD and Workflows

The project uses GitHub Actions for:
- **Main Deployment**: Automatic deployment to GitHub Pages on push to main
- **PR Previews**: Each PR gets a preview deployment at `/previews/pr-{number}/`
- **Testing**: Automated unit and E2E tests run on every PR and push to main
- **Test Build**: Manual workflow to test build process
- **Setup Validation**: Tests Bun and Just installation

**Important**: All workflows require Bun and Just to be properly set up. See `.github/workflows/copilot-setup-steps.yml` for the setup sequence.

## Dependencies

- **Runtime**: Bun (JavaScript runtime with built-in TypeScript support)
- **Build Tool**: Vite (for serving development builds)
- **Command Runner**: Just (alternative to make/npm scripts)
- **Visualization**: Chart.js for rendering graphs
- **Type Checking**: TypeScript with strict mode

When adding dependencies:
1. Use `bun add <package>` for runtime dependencies
2. Use `bun add -d <package>` for dev dependencies
3. Run tests after adding dependencies to ensure compatibility

## Areas to Avoid Modifying

**Do not modify without explicit need**:
- `.github/workflows/` - CI/CD pipelines (unless fixing CI issues)
- `.github/scripts/` - Deployment scripts (complex artifact management)
- `data_processed/` - Generated data files (regenerated by data processor)
- `node_modules/` - Managed by Bun
- `dist/` - Build output directory

**Critical files requiring careful attention**:
- `src/data_processor.ts` - Handles data fetching and transformation
- `index.html` - Entry point for the browser application
- `justfile` - Command definitions (changing these affects CI/CD)

## Security Considerations

- No API keys or secrets should be committed to the repository
- Data sources must be fetched over HTTPS
- Be cautious when adding new data sources - validate data integrity
- Browser localStorage is used for user preferences (non-sensitive data only)
- All external data should be validated before processing

## Guidelines

When contributing to this project, please follow these coding principles:

- **Keep It Simple (KISS)**: Prefer simple, readable code over complex solutions. Clear and straightforward implementations are easier to understand, maintain, and debug.
- **Don't Repeat Yourself (DRY)**: When it doesn't conflict with keeping the code simple, avoid duplication by extracting common functionality into reusable components or utilities.
- **Test Your Changes**: Always run `just test` before committing
- **Build Locally First**: Use `just build` to verify everything works
- **Follow TypeScript Conventions**: Use strict typing, avoid `any` when possible
