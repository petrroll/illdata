import { getAbsolutePath, normalizeDate, toFloat, saveData } from "./ioUtils";
import type { TimeseriesData, PositivitySeries } from "../utils";
import { promises as fs } from "fs";
import path from "path";

/**
 * Czech respiratory virus data from SZU (State Health Institute)
 * Source: https://szu.gov.cz/publikace-szu/data/akutni-respiracni-infekce-chripka/
 * 
 * The data contains weekly virus detection results from the national surveillance system.
 * Data is published weekly in PDF format with tables showing virus types and detection counts.
 * 
 * PDF parsing is done via a Python script that uses pdftotext (poppler-utils).
 */

export interface VirusWeekData {
    week: string;          // Calendar week (KT) in format "YYYY-WW"
    date: string;          // ISO date (YYYY-MM-DD) - Monday of the week
    influenzaA: number;    // Number of Influenza A detections
    influenzaB: number;    // Number of Influenza B detections
    rsv: number;           // RSV (Respiratory Syncytial Virus) detections
    adenovirus: number;    // Adenovirus detections
    rhinovirus: number;    // Rhinovirus detections
    parainfluenza: number; // Parainfluenza detections
    coronavirus: number;   // Coronavirus (non-SARS-CoV-2) detections
    totalTests: number;    // Total number of tests performed
}

/**
 * Parse ISO week string (e.g., "2025-W01") and convert to ISO date (Monday of that week)
 */
export function weekToDate(isoWeek: string): string {
    const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
    if (!match) {
        throw new Error(`Invalid ISO week format: ${isoWeek}`);
    }
    
    const year = parseInt(match[1]);
    const week = parseInt(match[2]);
    
    // ISO week 1 is the week with the year's first Thursday
    // Calculate the date of the Monday of that week
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7; // Sunday = 7
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - jan4Day + 1);
    
    // Add weeks
    const targetDate = new Date(firstMonday);
    targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    return targetDate.toISOString().split('T')[0];
}

/**
 * Convert Czech calendar week format (e.g., "1.KT 2026") to ISO week format
 */
export function czechWeekToIsoWeek(czechWeek: string): string {
    const match = czechWeek.match(/^(\d+)\.KT\s+(\d{4})$/);
    if (!match) {
        throw new Error(`Invalid Czech week format: ${czechWeek}`);
    }
    
    const week = parseInt(match[1]);
    const year = parseInt(match[2]);
    
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Load and parse manually prepared CSV data for SZU respiratory viruses.
 * 
 * CSV format:
 * week,influenzaA,influenzaB,rsv,adenovirus,rhinovirus,parainfluenza,coronavirus,totalTests
 * 2025-W40,15,3,45,12,23,8,5,250
 * 
 * Note: This CSV can be generated automatically from PDFs using downloadAndParseSzuPdfs()
 */
export async function loadSzuRespiratoryData(filename: string = "szu_respiratory.csv"): Promise<VirusWeekData[]> {
    const filepath = getAbsolutePath(`./data/${filename}`);
    
    try {
        const csvContent = await fs.readFile(filepath, "utf-8");
        const lines = csvContent.split("\n").filter(line => line.trim() !== "");
        
        // Skip header
        const dataLines = lines.slice(1);
        
        return dataLines.map(line => {
            const parts = line.split(",").map(p => p.trim());
            const week = parts[0];
            
            return {
                week,
                date: weekToDate(week),
                influenzaA: parseInt(parts[1]) || 0,
                influenzaB: parseInt(parts[2]) || 0,
                rsv: parseInt(parts[3]) || 0,
                adenovirus: parseInt(parts[4]) || 0,
                rhinovirus: parseInt(parts[5]) || 0,
                parainfluenza: parseInt(parts[6]) || 0,
                coronavirus: parseInt(parts[7]) || 0,
                totalTests: parseInt(parts[8]) || 0,
            };
        });
    } catch (error) {
        console.log(`Note: ${filename} not found. Using empty dataset.`);
        console.log("To add data, create ./data/szu_respiratory.csv with weekly virus detection data.");
        return [];
    }
}

/**
 * Compute time series data from SZU respiratory virus data
 */
export function computeSzuRespiratoryData(rawData: VirusWeekData[]): TimeseriesData {
    if (rawData.length === 0) {
        return {
            dates: [],
            series: []
        };
    }
    
    const dates = rawData.map(row => row.date);
    
    // Create series for each virus type
    const series: PositivitySeries[] = [
        {
            name: "Influenza A",
            values: rawData.map(row => ({
                positive: row.influenzaA,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Influenza B",
            values: rawData.map(row => ({
                positive: row.influenzaB,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "RSV",
            values: rawData.map(row => ({
                positive: row.rsv,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Adenovirus",
            values: rawData.map(row => ({
                positive: row.adenovirus,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Rhinovirus",
            values: rawData.map(row => ({
                positive: row.rhinovirus,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Parainfluenza",
            values: rawData.map(row => ({
                positive: row.parainfluenza,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Coronavirus (non-CoV-2)",
            values: rawData.map(row => ({
                positive: row.coronavirus,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        }
    ];
    
    return {
        dates,
        series
    };
}

/**
 * Download a PDF file from a URL
 */
async function downloadPdf(url: string, filepath: string): Promise<void> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        const dir = path.dirname(filepath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filepath, Buffer.from(buffer));
        console.log(`Downloaded PDF to ${filepath}`);
    } catch (error) {
        console.error(`Error downloading PDF from ${url}:`, error);
        throw error;
    }
}

/**
 * Parse a PDF file using the Python script
 */
async function parsePdf(pdfPath: string): Promise<VirusWeekData | null> {
    try {
        const scriptPath = getAbsolutePath('./scripts/parse_szu_pdf.py');
        
        // Check if Python script exists
        try {
            await fs.access(scriptPath);
        } catch {
            console.error(`PDF parser script not found at ${scriptPath}`);
            return null;
        }
        
        // Run the Python script
        const proc = Bun.spawn(['python3', scriptPath, pdfPath, '--json'], {
            stdout: 'pipe',
            stderr: 'pipe'
        });
        
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        await proc.exited;
        
        if (proc.exitCode !== 0) {
            console.error(`PDF parsing failed: ${stderr}`);
            return null;
        }
        
        // Parse JSON output
        const result = JSON.parse(stdout);
        
        // Convert to VirusWeekData format
        return {
            week: result.week,
            date: weekToDate(result.week),
            influenzaA: result.influenzaA || 0,
            influenzaB: result.influenzaB || 0,
            rsv: result.rsv || 0,
            adenovirus: result.adenovirus || 0,
            rhinovirus: result.rhinovirus || 0,
            parainfluenza: result.parainfluenza || 0,
            coronavirus: result.coronavirus || 0,
            totalTests: result.totalTests || 0
        };
    } catch (error) {
        console.error(`Error parsing PDF ${pdfPath}:`, error);
        return null;
    }
}

/**
 * Scrape the SZU website for PDF links
 * Returns a list of {week, pdfUrl} objects
 */
async function scrapeSzuWebsite(): Promise<Array<{week: string, pdfUrl: string}>> {
    const baseUrl = 'https://szu.gov.cz/publikace-szu/data/akutni-respiracni-infekce-chripka/';
    
    try {
        const response = await fetch(baseUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch SZU website: ${response.statusText}`);
        }
        
        const html = await response.text();
        const pdfLinks: Array<{week: string, pdfUrl: string}> = [];
        
        // Look for PDF links with "Výsledky-viry" or "vysledky-viry" in the name
        // Pattern: href="...vysledky-viry.pdf" or similar
        const linkRegex = /<a[^>]+href=["']([^"']*vysledky[^"']*\.pdf)["'][^>]*>/gi;
        let match;
        
        while ((match = linkRegex.exec(html)) !== null) {
            let pdfUrl = match[1];
            
            // Make absolute URL if relative
            if (!pdfUrl.startsWith('http')) {
                if (pdfUrl.startsWith('/')) {
                    pdfUrl = `https://szu.gov.cz${pdfUrl}`;
                } else {
                    pdfUrl = `${baseUrl}${pdfUrl}`;
                }
            }
            
            // Extract week from the URL or nearby text
            // Look for patterns like "4.KT 2026" or "51.KT 2025"
            const weekMatch = pdfUrl.match(/(\d+)\.?KT[_\s-]+(\d{4})/i);
            if (weekMatch) {
                const week = czechWeekToIsoWeek(`${weekMatch[1]}.KT ${weekMatch[2]}`);
                pdfLinks.push({ week, pdfUrl });
            }
        }
        
        console.log(`Found ${pdfLinks.length} PDF links on SZU website`);
        return pdfLinks;
    } catch (error) {
        console.error('Error scraping SZU website:', error);
        return [];
    }
}

/**
 * Download and parse all SZU respiratory virus PDFs
 * This function will:
 * 1. Scrape the SZU website for PDF links
 * 2. Download each PDF
 * 3. Parse each PDF using the Python script
 * 4. Generate a CSV file with all the data
 */
export async function downloadAndParseSzuPdfs(
    outputCsv: string = "szu_respiratory.csv",
    limitWeeks: number = 52
): Promise<VirusWeekData[]> {
    console.log('Starting SZU PDF download and parsing...');
    
    // Scrape website for PDF links
    const pdfLinks = await scrapeSzuWebsite();
    
    if (pdfLinks.length === 0) {
        console.log('No PDF links found. Please check the SZU website or download PDFs manually.');
        return [];
    }
    
    // Limit to most recent weeks
    const recentLinks = pdfLinks.slice(0, limitWeeks);
    console.log(`Processing ${recentLinks.length} most recent weeks...`);
    
    const allData: VirusWeekData[] = [];
    const pdfDir = getAbsolutePath('./data/szu_pdfs');
    await fs.mkdir(pdfDir, { recursive: true });
    
    // Process each PDF
    for (const {week, pdfUrl} of recentLinks) {
        console.log(`Processing week ${week}...`);
        
        const pdfFilename = `${week}_vysledky-viry.pdf`;
        const pdfPath = path.join(pdfDir, pdfFilename);
        
        try {
            // Download PDF if not already downloaded
            try {
                await fs.access(pdfPath);
                console.log(`  PDF already downloaded: ${pdfPath}`);
            } catch {
                console.log(`  Downloading from ${pdfUrl}...`);
                await downloadPdf(pdfUrl, pdfPath);
            }
            
            // Parse PDF
            console.log(`  Parsing PDF...`);
            const data = await parsePdf(pdfPath);
            
            if (data) {
                allData.push(data);
                console.log(`  ✓ Successfully parsed week ${week}`);
            } else {
                console.log(`  ✗ Failed to parse week ${week}`);
            }
        } catch (error) {
            console.error(`  Error processing week ${week}:`, error);
        }
    }
    
    // Sort by date
    allData.sort((a, b) => a.date.localeCompare(b.date));
    
    // Save to CSV
    if (allData.length > 0) {
        const csvPath = getAbsolutePath(`./data/${outputCsv}`);
        const header = 'week,influenzaA,influenzaB,rsv,adenovirus,rhinovirus,parainfluenza,coronavirus,totalTests\n';
        const rows = allData.map(row => 
            `${row.week},${row.influenzaA},${row.influenzaB},${row.rsv},${row.adenovirus},${row.rhinovirus},${row.parainfluenza},${row.coronavirus},${row.totalTests}`
        ).join('\n');
        
        await fs.writeFile(csvPath, header + rows);
        console.log(`\nSaved ${allData.length} weeks of data to ${csvPath}`);
    } else {
        console.log('\nNo data was successfully parsed.');
    }
    
    return allData;
}

