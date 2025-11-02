import { downloadAndSaveCsv, getAbsolutePath, toFloat } from "./ioUtils";
import type { TimeseriesData } from "../utils";
import { promises as fs } from "fs";

export async function downloadDeAreData(filename: string = "ARE-Konsultationsinzidenz.tsv") {
    const filePath = getAbsolutePath(`./data/${filename}`);

    if (await fs.access(filePath).then(() => true).catch(() => false)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const url = `https://raw.githubusercontent.com/robert-koch-institut/ARE-Konsultationsinzidenz/main/${filename}`;
    await downloadAndSaveCsv(url, filePath);
}

export async function loadAndParseTsv(filename: string): Promise<Record<string, string>[]> {
    const filepath = getAbsolutePath(`./data/${filename}`);
    const tsvContent = await fs.readFile(filepath, "utf-8");
    return parseTsv(tsvContent);
}

function parseTsv(tsvContent: string): Record<string, string>[] {
    const lines = tsvContent.split("\n").filter(line => line.trim() !== "");

    // First line contains headers
    const headers = lines[0].split("\t").map(h => h.trim());
    const data = lines.slice(1).map(line => {
        const values = line.split("\t").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
            row[header] = values[i] || "";
        });
        return row;
    });

    console.log("Parsed TSV data");
    return data;
}

function convertWeekToDate(yearweek: string): string {
    // Format is YYYY-Wxx (e.g., 2012-W40)
    const parts = yearweek.split('-W');
    const year = parseInt(parts[0]);
    const week = parseInt(parts[1]);
    
    // Calculate date from ISO week
    // January 4th is always in week 1
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7; // Sunday = 7
    const startOfWeek1 = new Date(jan4.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000);
    const targetDate = new Date(startOfWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    
    return targetDate.toISOString().split('T')[0];
}

export function computeDeAreData(data: Record<string, string>[]): TimeseriesData {
    // Filter for nationwide data only (Bundesweit)
    const bundesweitData = data.filter(row => row["Bundesland"] === "Bundesweit");

    // Group by calendar week and age group
    const groupedData = new Map<string, Map<string, number>>();
    
    bundesweitData.forEach(row => {
        const week = row["Kalenderwoche"];
        const ageGroup = row["Altersgruppe"];
        const incidence = toFloat(row, "ARE_Konsultationsinzidenz");
        
        if (!groupedData.has(week)) {
            groupedData.set(week, new Map());
        }
        groupedData.get(week)!.set(ageGroup, incidence);
    });

    // Get unique dates and age groups
    const weeks = [...groupedData.keys()].sort();
    const dates = weeks.map(convertWeekToDate);
    const ageGroups = ["00+", "0-4", "5-14", "15-34", "35-59", "60+"];

    // Create series for each age group
    // Note: This data is already an incidence (per 100k), not a positivity rate
    // We'll store it as if it were test data to reuse the visualization infrastructure
    return {
        dates,
        series: ageGroups.map(ageGroup => ({
            name: `ARE ${ageGroup} years`,
            values: weeks.map(week => {
                const incidence = groupedData.get(week)?.get(ageGroup) ?? 0;
                // Store incidence as "positive" and set tests to 100000 to represent per 100k
                // This way, when visualized as percentage, 1% = 1000 per 100k
                return {
                    positive: incidence,
                    tests: 100000
                };
            }),
            type: 'raw',
            frequencyInDays: 7
        }))
    };
}
