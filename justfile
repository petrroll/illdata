# Default recipe to run when just is called without arguments
default: serve

build: && process-data
    bun install

# Process data (requires dependencies to be installed first)
process-data:
    bun run ./src/data_processor.ts


# Start the dashboard
serve:
    bun run bunx vite

generate:
    bun build ./index.html --outdir=./dist

check-ts:
    bun run tsc --noEmit

# Run type checks and unit tests
test: check-ts
    bun test

# Run Playwright end-to-end tests
test-e2e:
    bunx playwright test

# Run Playwright tests in UI mode for debugging
test-e2e-ui:
    bunx playwright test --ui

# Run Playwright tests in headed mode
test-e2e-headed:
    bunx playwright test --headed

# Run all tests (unit + e2e)
test-all: test test-e2e

# Setup playground environment
setup-playground: build
    uv sync
    source dev.env

clean-data:
    rm -rf ./data
    rm -rf ./data_processed

clean: clean-data
    rm -rf ./dist
