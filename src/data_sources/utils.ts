import path from "path";
import { promises as fs } from "fs";

export function toFloat(row: Record<string, string>, key: string): number {
    return parseFloat(row[key] || "0");
}

export function getAbsolutePath(relativePath: string): string {
    return path.resolve(process.cwd(), relativePath);
}

export function parseCsv(csvContent: string) {
    const lines = csvContent.split("\n").filter(line => line.trim() !== "");

    // Assume first line contains headers
    const headers = lines[0].split(",").map(h => h.trim());
    const data = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
            row[header] = values[i] || "";
        });
        return row;
    });

    console.log("Parsed CSV data");
    return data;
}

export async function downloadCsv(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    const csvContent = await response.text();
    return csvContent;
}

export async function saveData<T>(data: T, filePath: string): Promise<void> {
    filePath = getAbsolutePath(filePath);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Data saved to ${filePath}`);
}
