import { downloadAndSaveCsv, getAbsolutePath, parseDelimited } from "./ioUtils";
import type { TimeseriesData, PositivitySeries } from "../utils";

export async function downloadNlInfectieradarData(filename: string = "data_pathogens.csv") {
    const filePath = getAbsolutePath(`./data/${filename}`);
    const url = `https://dashboard.infectieradar.nl/data/${filename}`;
    await downloadAndSaveCsv(url, filePath);
}

/**
 * Parse semicolon-separated CSV content (used by NL Infectieradar data).
 * The NL data uses semicolons as delimiters and commas as decimal separators.
 */
export function parseSemicolonCsv(csvContent: string): Record<string, string>[] {
    return parseDelimited(csvContent, ";", "semicolon-separated CSV");
}

/**
 * Compute positivity data from NL Infectieradar data_pathogens.csv.
 * 
 * CSV columns (semicolon-separated):
 * - WEEK: Start date of reporting week (YYYY-MM-DD)
 * - SAMPLES_N: Number of samples tested that week
 * - PATHOGEN: Name of detected pathogen (e.g., "SARS-CoV-2", "Influenza A")
 * - PERC: Percentage positive (comma as decimal separator, e.g., "3,51")
 * - WEEK_LABEL: Human-readable Dutch week label
 */
export function computeNlInfectieradarData(data: Record<string, string>[]): TimeseriesData {
    // Group by date and pathogen
    const groupedData = new Map<string, Map<string, { tests: number, positive: number }>>();

    data.forEach(row => {
        const datum = row["WEEK"] || "";
        const pathogen = normalizePathogenName(row["PATHOGEN"] || "");
        const samplesN = parseInt(row["SAMPLES_N"] || "0", 10);
        // PERC uses comma as decimal separator
        const perc = parseFloat((row["PERC"] || "0").replace(",", "."));

        if (!datum || !pathogen || isNaN(samplesN) || isNaN(perc)) {
            return;
        }

        if (!groupedData.has(datum)) {
            groupedData.set(datum, new Map());
        }
        const dateGroup = groupedData.get(datum)!;

        if (!dateGroup.has(pathogen)) {
            dateGroup.set(pathogen, { tests: 0, positive: 0 });
        }
        const stats = dateGroup.get(pathogen)!;

        // For aggregated pathogens (e.g., Influenza A + B -> Influenza),
        // we combine samples and weighted positives
        // positive count = perc/100 * samplesN (rounded to avoid floating point issues)
        const positiveCount = (perc / 100) * samplesN;
        stats.tests += samplesN;
        stats.positive += positiveCount;
    });

    const dates = [...groupedData.keys()].sort();
    const pathogens = [...new Set(data.map(row => normalizePathogenName(row["PATHOGEN"] || "")))].filter(Boolean);
    // Deduplicate after normalization
    const uniquePathogens = [...new Set(pathogens)];

    const allSeries: PositivitySeries[] = uniquePathogens.map(pathogen => ({
        name: `${pathogen} Positivity`,
        values: dates.map(date => {
            const stats = groupedData.get(date)?.get(pathogen);
            return {
                positive: stats ? Math.round(stats.positive) : 0,
                tests: stats ? stats.tests : 0
            };
        }),
        type: 'raw' as const,
        frequencyInDays: 7,
        dataType: 'positivity' as const
    }));

    return {
        dates,
        series: allSeries
    };
}

/**
 * Normalize pathogen names to aggregate subtypes.
 * E.g., "Influenza A" and "Influenza B" → "Influenza"
 */
function normalizePathogenName(name: string): string {
    if (name.includes("Parainfluenza")) return "Parainfluenza";
    if (name.includes("Influenza")) return "Influenza";
    return name;
}
