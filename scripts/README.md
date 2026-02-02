# SZU PDF Parser

This script parses respiratory virus data from Czech State Health Institute (SZU) PDF reports.

## Prerequisites

The script requires `pdftotext` from poppler-utils:

**Ubuntu/Debian:**
```bash
sudo apt-get install poppler-utils
```

**macOS:**
```bash
brew install poppler
```

**Windows:**
Download and install from: https://github.com/oschwartz10612/poppler-windows/releases/

## Usage

### Parse a single PDF file

```bash
# Output to stdout as CSV
python3 scripts/parse_szu_pdf.py path/to/vysledky-viry.pdf

# Output as JSON
python3 scripts/parse_szu_pdf.py path/to/vysledky-viry.pdf --json

# Append to CSV file
python3 scripts/parse_szu_pdf.py path/to/vysledky-viry.pdf --output data/szu_respiratory.csv
```

### Automated parsing (via TypeScript)

The data processor will automatically:
1. Scrape the SZU website for PDF links
2. Download PDFs
3. Parse them using this script
4. Generate the CSV file

Just run:
```bash
bun run ./src/data_processor.ts
```

## How it works

1. **Extract text**: Uses `pdftotext` to convert PDF to plain text
2. **Parse week**: Extracts week number from filename (e.g., "4.KT 2026" → "2026-W04")
3. **Extract virus counts**: Looks for virus names and adjacent numbers in the text
4. **Output data**: Generates CSV or JSON with virus detection counts

## Expected PDF format

The script expects PDFs with tables containing:
- Influenza A
- Influenza B
- RSV (Respiratory Syncytial Virus)
- Adenovirus
- Rhinovirus
- Parainfluenza
- Coronavirus (non-SARS-CoV-2)
- Total tests ("Celkem")

## Troubleshooting

**"pdftotext not found"**
- Install poppler-utils (see Prerequisites)

**No data extracted**
- Check PDF format - the script looks for Czech virus names
- Try running with `--json` to see what was parsed
- PDF structure may have changed - update parsing logic in script

**Wrong week number**
- Ensure PDF filename contains week in format "X.KT YYYY" (e.g., "4.KT 2026")
