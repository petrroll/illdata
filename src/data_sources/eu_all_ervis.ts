import { promises as fs } from "fs";
import { downloadAndSaveCsv, getAbsolutePath, normalizeDate, toFloat } from "./ioUtils";
import type { TimeseriesData } from "../utils";

export async function downloadEuEcdcData(filename: string = "nonSentinelTestsDetections.csv") {
    const filePath = getAbsolutePath(`./data/${filename}`);

    if (await fs.exists(filePath)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const url = `https://raw.githubusercontent.com/EU-ECDC/Respiratory_viruses_weekly_data/main/data/${filename}`;
    await downloadAndSaveCsv(url, filePath);
}

export function computeEuEcdcData(data: Record<string, string>[]): TimeseriesData {
    // Filter for main pathogen types (where pathogen equals pathogentype)
    const mainPathogens = data.filter(row => row["pathogen"] === row["pathogentype"]);

    const processedData = mainPathogens.map(row => {
        // Convert yearweek to date (YYYY-MM-DD format)
        const yearweek = row["yearweek"];
        const year = parseInt(yearweek.split('-W')[0]);
        const week = parseInt(yearweek.split('-W')[1]);
        const date = new Date(year, 0, 1 + (week - 1) * 7);
        const datum = date.toISOString().split('T')[0];

        // Get tests and detections based on indicator type
        const value = toFloat(row, "value");
        const tests = row["indicator"] === "tests" ? value : 0;
        const detections = row["indicator"] === "detections" ? value : 0;

        return {
            datum,
            pathogen: row["pathogen"],
            tests,
            detections
        };
    });

    // Group by date and pathogen, aggregate tests and detections
    const groupedData = new Map<string, Map<string, { tests: number, detections: number }>>();
    
    processedData.forEach(row => {
        if (!groupedData.has(row.datum)) {
            groupedData.set(row.datum, new Map());
        }
        const dateGroup = groupedData.get(row.datum)!;
        
        if (!dateGroup.has(row.pathogen)) {
            dateGroup.set(row.pathogen, { tests: 0, detections: 0 });
        }
        const pathogenStats = dateGroup.get(row.pathogen)!;
        
        pathogenStats.tests += row.tests;
        pathogenStats.detections += row.detections;
    });

    // Get unique dates and pathogens
    const dates = [...groupedData.keys()].sort();
    const pathogens = [...new Set(processedData.map(row => row.pathogen))];

    // Create series for each pathogen
    return {
        dates,
        series: pathogens.map(pathogen => ({
            name: `${pathogen} Positivity`,
            values: dates.map(date => {
                const stats = groupedData.get(date)?.get(pathogen);
                return {
                    positive: stats ? stats.detections : 0,
                    tests: stats ? stats.tests : 0
                };
            }),
            type: 'raw',
            frequencyInDays: 7
        }))
    };
}