import { promises as fs } from "fs";
import { downloadCsv, getAbsolutePath, parseCsv } from "./utils";

export async function downloadCzCovPositivity(filename: string, perDay: boolean = false) {
    let storedFilename = filename;
    if (perDay) {
        storedFilename = createPerDayName(filename, storedFilename);
    }
    const filePath = getAbsolutePath(`./data/${storedFilename}`);

    if (await fs.exists(filePath)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const url = `https://onemocneni-aktualne.mzcr.cz/api/v2/covid-19/${filename}`;
    const csvContent = await downloadCsv(url);

    await fs.mkdir("./data", { recursive: true });
    await fs.writeFile(filePath, csvContent, "utf-8");
    console.log(`CSV downloaded and saved to ${filePath}`);
}

export async function loadAndParseCsv(filename: string) {
    const filepath = getAbsolutePath(`./data/${filename}`);
    const csvContent = await fs.readFile(filepath, "utf-8");
    return parseCsv(csvContent);
}

function createPerDayName(filename: string, storedFilename: string) {
    // Use current date in YYYY-MM-DD format
    const today = new Date().toISOString().slice(0, 10);
    const dotIndex = filename.lastIndexOf('.');
    storedFilename = dotIndex !== -1
        ? `${filename.slice(0, dotIndex)}_${today}${filename.slice(dotIndex)}`
        : `${filename}_${today}`;
    return storedFilename;
}

