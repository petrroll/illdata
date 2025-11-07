---
applies_to:
  - "src/data_sources/**"
---

# Data Sources Instructions

The `src/data_sources/` directory contains modules for fetching and processing data from various sources (Czech Republic, Germany, EU-wide data, etc.).

## File Naming Convention

- Each data source has its own file: `{country}_{dataset}_{source}.ts`
  - Example: `cr_cov_mzcr.ts` (Czech Republic COVID data from MZCR)
  - Example: `de_wastewater_amelag.ts` (Germany wastewater data from AMELAG)
- Test files follow the pattern: `{source}.test.ts`
- Shared utilities are in `ioUtils.ts`

## Data Source Module Structure

Each data source module should export:

1. **Processing Function**: Transforms raw data into `TimeseriesData` format
   - Name pattern: `compute{Country}{Dataset}Data`
   - Input: Array of records from CSV/API
   - Output: `TimeseriesData` object with dates and series

2. **Download Function**: Fetches data from external source
   - Name pattern: `download{Country}{Dataset}`
   - Saves data to `./data/` directory
   - Should use utilities from `ioUtils.ts`

## Data Processing Guidelines

- **Always validate data**: Check for missing values, zero totals, inconsistent dates
- **Log warnings**: Use `console.log` for data quality issues (see examples in existing files)
- **Use shared utilities**: 
  - `normalizeDate()` for date formatting
  - `toFloat()` for numeric conversion
  - `downloadCsv()` / `downloadAndSaveCsv()` for fetching data
  - `getAbsolutePath()` for file paths
- **Return consistent format**: All processing functions must return `TimeseriesData` type

## Output Format

```typescript
{
    dates: string[],  // ISO format dates
    series: [
        {
            name: string,          // Human-readable series name
            values: PositivityData[] | number[],
            type: 'raw',          // Always 'raw' for source data
            frequencyInDays: number,  // Data collection frequency
            dataType: 'positivity' | 'number'
        }
    ]
}
```

## Testing Requirements

- Each data source should have corresponding tests in `{source}.test.ts`
- Test both the processing function and edge cases:
  - Missing data
  - Empty input
  - Data aggregation logic
  - Format variations
- Use realistic test data that matches actual data structure

## Security

- All data sources must use HTTPS
- No API keys should be hardcoded
- Validate all external data before processing
- Handle network failures gracefully
