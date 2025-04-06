# Default recipe to run when just is called without arguments
default: launch

build: && process-data
    bun install

# Process data (requires dependencies to be installed first)
process-data:
    bun run ./src/data_processor.ts


# Start the dashboard
launch:
    bun run bunx vite

generate:
    bun build ./index.html --outdir=./dist

# Run type checks and tests
test:
    bun run tsc --noEmit
    bun test

# Setup playground environment
setup-playground: build
    uv sync
    source dev.env