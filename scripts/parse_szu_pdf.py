#!/usr/bin/env python3
"""
Parse SZU respiratory virus PDFs and extract weekly data.

This script downloads and parses the "Výsledky-viry" PDFs from the SZU website
and extracts virus detection data into CSV format.

Requirements:
    poppler-utils (pdftotext command)
"""

import sys
import re
import json
import argparse
from pathlib import Path
from typing import Dict, Optional
import subprocess

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using pdftotext (poppler-utils)."""
    try:
        result = subprocess.run(
            ['pdftotext', '-layout', pdf_path, '-'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except FileNotFoundError:
        print("Error: pdftotext not found. Please install poppler-utils:", file=sys.stderr)
        print("  Ubuntu/Debian: sudo apt-get install poppler-utils", file=sys.stderr)
        print("  macOS: brew install poppler", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"Error extracting text from PDF: {e}", file=sys.stderr)
        sys.exit(1)

def parse_week_from_filename(filename: str) -> Optional[str]:
    """
    Extract week number and year from filename.
    Expected formats: "1.KT 2026", "51.KT 2025", etc.
    """
    match = re.search(r'(\d+)\.?KT\s+(\d{4})', filename, re.IGNORECASE)
    if match:
        week = int(match.group(1))
        year = int(match.group(2))
        return f"{year}-W{week:02d}"
    return None

def parse_virus_table(text: str) -> Dict[str, int]:
    """
    Parse the virus detection table from the PDF text.
    """
    virus_data = {
        'influenzaA': 0,
        'influenzaB': 0,
        'rsv': 0,
        'adenovirus': 0,
        'rhinovirus': 0,
        'parainfluenza': 0,
        'coronavirus': 0,
        'totalTests': 0
    }
    
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        line_lower = line.lower()
        
        # Look for Influenza A
        if 'influenza' in line_lower and 'a' in line_lower and 'b' not in line_lower:
            numbers = re.findall(r'\b(\d+)\b', line)
            if numbers:
                virus_data['influenzaA'] = int(numbers[-1])
        
        # Look for Influenza B
        elif 'influenza' in line_lower and 'b' in line_lower:
            numbers = re.findall(r'\b(\d+)\b', line)
            if numbers:
                virus_data['influenzaB'] = int(numbers[-1])
        
        # Look for RSV
        elif 'rsv' in line_lower or 'respiratory syncytial' in line_lower:
            numbers = re.findall(r'\b(\d+)\b', line)
            if numbers:
                virus_data['rsv'] = int(numbers[-1])
        
        # Look for Adenovirus
        elif 'adenovir' in line_lower:
            numbers = re.findall(r'\b(\d+)\b', line)
            if numbers:
                virus_data['adenovirus'] = int(numbers[-1])
        
        # Look for Rhinovirus
        elif 'rhinovir' in line_lower:
            numbers = re.findall(r'\b(\d+)\b', line)
            if numbers:
                virus_data['rhinovirus'] = int(numbers[-1])
        
        # Look for Parainfluenza
        elif 'parainfluenza' in line_lower or 'paragrip' in line_lower:
            numbers = re.findall(r'\b(\d+)\b', line)
            if numbers:
                virus_data['parainfluenza'] = int(numbers[-1])
        
        # Look for Coronavirus (non-COVID)
        elif 'coronavirus' in line_lower and 'covid' not in line_lower and 'sars' not in line_lower:
            numbers = re.findall(r'\b(\d+)\b', line)
            if numbers:
                virus_data['coronavirus'] = int(numbers[-1])
        
        # Look for total tests
        elif 'celkem' in line_lower or 'total' in line_lower or 'všech' in line_lower:
            numbers = re.findall(r'\b(\d+)\b', line)
            if numbers:
                virus_data['totalTests'] = max(int(n) for n in numbers)
    
    # If totalTests is 0, calculate it as sum of all detections
    if virus_data['totalTests'] == 0:
        virus_data['totalTests'] = sum(v for k, v in virus_data.items() if k != 'totalTests')
    
    return virus_data

def main():
    parser = argparse.ArgumentParser(description='Parse SZU respiratory virus PDF')
    parser.add_argument('pdf_path', help='Path to the PDF file')
    parser.add_argument('--output', '-o', help='Output CSV file', default=None)
    parser.add_argument('--json', action='store_true', help='Output as JSON instead of CSV')
    
    args = parser.parse_args()
    
    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    # Extract week from filename
    week = parse_week_from_filename(pdf_path.name)
    if not week:
        print(f"Warning: Could not extract week from filename: {pdf_path.name}", file=sys.stderr)
        week = "UNKNOWN"
    
    # Extract and parse PDF
    text = extract_text_from_pdf(str(pdf_path))
    virus_data = parse_virus_table(text)
    
    # Add week information
    result = {'week': week, **virus_data}
    
    # Output results
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        # CSV format
        header = "week,influenzaA,influenzaB,rsv,adenovirus,rhinovirus,parainfluenza,coronavirus,totalTests"
        row = f"{result['week']},{result['influenzaA']},{result['influenzaB']},{result['rsv']},{result['adenovirus']},{result['rhinovirus']},{result['parainfluenza']},{result['coronavirus']},{result['totalTests']}"
        
        if args.output:
            output_path = Path(args.output)
            # Check if file exists to determine if we need header
            write_header = not output_path.exists()
            with open(output_path, 'a') as f:
                if write_header:
                    f.write(header + '\n')
                f.write(row + '\n')
            print(f"Appended data to {output_path}")
        else:
            print(header)
            print(row)

if __name__ == '__main__':
    main()
