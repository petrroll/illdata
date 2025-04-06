# illmeter

This project explores illness positivity rates across Europe—with a primary focus on Czechia—and delivers a single pane of glass dashboard for data visualization.

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

- **Test**: Run type checks and tests.
    ```bash
    just test
    ```

## Data Exploration

An UV-managed Jupyter playground is available in `./playground` to explore the data retrieved by the data processor.
