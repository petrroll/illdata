import path from "path";
import { promises as fs } from "fs";

export function toFloat(row: Record<string, string>, key: string): number {
    return parseFloat(row[key] || "0");
}

export function normalizeDate(date: string): string {
    if (!date) return '';
    
    // Try parsing the date
    const parsed = new Date(date.replace(/\./g, '-')); // Replace dots with dashes to help Date.parse
    
    if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date format: ${date}`);
    }

    // Format to YYYY-MM-DD
    return parsed.toISOString().split('T')[0];
}

export function getAbsolutePath(relativePath: string): string {
    return path.resolve(process.cwd(), relativePath);
}

export async function loadAndParseCsv(filename: string) {
    const filepath = getAbsolutePath(`./data/${filename}`);
    const csvContent = await fs.readFile(filepath, "utf-8");
    return parseCsv(csvContent);
}

export async function loadAndParseTsv(filename: string) {
    const filepath = getAbsolutePath(`./data/${filename}`);
    const tsvContent = await fs.readFile(filepath, "utf-8");
    return parseTsv(tsvContent);
}

export function parseDelimited(content: string, delimiter: string, label: string) {
    const lines = content.split("\n").filter(line => line.trim() !== "");

    if (lines.length === 0) {
        throw new Error(`Cannot parse ${label} data: content is empty`);
    }

    // Assume first line contains headers
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const data = lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
            row[header] = values[i] || "";
        });
        return row;
    });

    console.log(`Parsed ${label} data`);
    return data;
}

export function parseCsv(csvContent: string) {
    return parseDelimited(csvContent, ",", "CSV");
}

export function parseTsv(tsvContent: string) {
    return parseDelimited(tsvContent, "\t", "TSV");
}

export async function downloadAndSaveCsv(url: string, filePath: string): Promise<void> {
    if (await fs.access(filePath).then(() => true).catch(() => false)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const csvContent = await downloadCsv(url);
    
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, csvContent, "utf-8");
    console.log(`CSV downloaded and saved to ${filePath}`);
}

async function downloadWithRetries<T>(
    url: string,
    label: string,
    read: (response: Response) => Promise<T>,
    isEmpty: (content: T) => boolean,
    retries: number,
    retryDelayMs: number
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${label}: ${response.statusText}`);
            const content = await read(response);
            // Some upstream sources intermittently answer with HTTP 200 and an empty
            // body. Treat that as a transient failure and retry instead of saving an
            // empty file that would later crash parsing and break the build.
            if (isEmpty(content)) throw new Error(`Fetched ${label} is empty`);
            return content;
        } catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Download attempt ${attempt}/${retries} for ${url} failed: ${message}`);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            }
        }
    }
    throw new Error(`Failed to download ${label} from ${url} after ${retries} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function downloadCsv(url: string, retries: number = 3, retryDelayMs: number = 1000) {
    return downloadWithRetries(url, "CSV", response => response.text(), content => content.trim() === "", retries, retryDelayMs);
}

export async function downloadText(url: string, retries: number = 3, retryDelayMs: number = 1000) {
    return downloadWithRetries(url, "text", response => response.text(), content => content.trim() === "", retries, retryDelayMs);
}

export async function downloadBinary(url: string, retries: number = 3, retryDelayMs: number = 1000) {
    return downloadWithRetries(url, "file", async response => new Uint8Array(await response.arrayBuffer()), content => content.length === 0, retries, retryDelayMs);
}

/** Returns the Monday (YYYY-MM-DD) of the given ISO week. */
export function isoWeekToDate(year: number, week: number): string {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
    return monday.toISOString().split("T")[0];
}

export async function saveData<T>(data: T, filePath: string): Promise<void> {
    filePath = getAbsolutePath(filePath);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Data saved to ${filePath}`);
}
