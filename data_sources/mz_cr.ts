import { promises as fs } from "fs";

export async function downloadCzkCovidCsv(filename: string, perDay: boolean = false) {
    let storedFilename = filename;
    if (perDay) {
        // Use current date in YYYY-MM-DD format
        const today = new Date().toISOString().slice(0, 10);
        const dotIndex = filename.lastIndexOf('.');
        storedFilename = dotIndex !== -1 
            ? `${filename.slice(0, dotIndex)}_${today}${filename.slice(dotIndex)}` 
            : `${filename}_${today}`;
    }
    const filePath = `./data/${storedFilename}`;

    try {
        await fs.access(filePath);
        console.log(`File already exists at ${filePath}`);
        return;
    } catch {
        // File doesn't exist, proceed to download
    }

    await fs.mkdir("./data", { recursive: true });
    const url = `https://onemocneni-aktualne.mzcr.cz/api/v2/covid-19/${filename}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    const csvContent = await response.text();

    await fs.writeFile(filePath, csvContent, "utf-8");
    console.log(`CSV downloaded and saved to ${filePath}`);
}

export async function loadAndParseCsv(filename: string) {
    const csvContent = await fs.readFile(`./data/${filename}`, "utf-8");
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
