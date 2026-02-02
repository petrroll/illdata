import { downloadAndSaveCsv, getAbsolutePath, normalizeDate, toFloat } from "./ioUtils";
import type { TimeseriesData, PositivitySeries } from "../utils";

export async function downloadEuEcdcData(filename: string = "nonSentinelTestsDetections.csv") {
    const filePath = getAbsolutePath(`./data/${filename}`);
    const url = `https://raw.githubusercontent.com/EU-ECDC/Respiratory_viruses_weekly_data/main/data/${filename}`;
    await downloadAndSaveCsv(url, filePath);
}

export function computeEuEcdcData(data: Record<string, string>[], preserveSurvtype: boolean = false): TimeseriesData {
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
            country: row["countryname"],
            survtype: row["survtype"],
            tests,
            detections
        };
    });

    // Group by date, country, pathogen, and optionally survtype
    const groupedData = new Map<string, Map<string, Map<string, Map<string, { tests: number, detections: number }>>>>();
    
    processedData.forEach(row => {
        if (!groupedData.has(row.datum)) {
            groupedData.set(row.datum, new Map());
        }
        const dateGroup = groupedData.get(row.datum)!;
        
        if (!dateGroup.has(row.country)) {
            dateGroup.set(row.country, new Map());
        }
        const countryGroup = dateGroup.get(row.country)!;
        
        if (!countryGroup.has(row.pathogen)) {
            countryGroup.set(row.pathogen, new Map());
        }
        const pathogenGroup = countryGroup.get(row.pathogen)!;
        
        // Group by survtype if preserving it, otherwise use a single key
        const survtypeKey = preserveSurvtype ? row.survtype : "all";
        if (!pathogenGroup.has(survtypeKey)) {
            pathogenGroup.set(survtypeKey, { tests: 0, detections: 0 });
        }
        const survtypeStats = pathogenGroup.get(survtypeKey)!;
        
        survtypeStats.tests += row.tests;
        survtypeStats.detections += row.detections;
    });

    // Get unique dates, countries, pathogens, and survtypes
    const dates = [...groupedData.keys()].sort();
    const countries = [...new Set(processedData.map(row => row.country))].sort();
    const pathogens = [...new Set(processedData.map(row => row.pathogen))];
    const survtypes = preserveSurvtype ? [...new Set(processedData.map(row => row.survtype))].sort() : ["all"];

    // Create series for each combination
    const allSeries: PositivitySeries[] = countries.flatMap(country => 
        pathogens.flatMap(pathogen =>
            survtypes.map(survtype => {
                // Include survtype in name when preserving it to ensure unique series names
                const baseName = `${pathogen} Positivity`;
                const seriesName = preserveSurvtype && survtype !== "all" 
                    ? `${baseName} (${survtype === "primary care sentinel" ? "Sentinel" : "Non-Sentinel"})`
                    : baseName;
                
                return {
                    name: seriesName,
                    country: country,
                    survtype: preserveSurvtype ? survtype : undefined,
                    values: dates.map(date => {
                        const stats = groupedData.get(date)?.get(country)?.get(pathogen)?.get(survtype);
                        return {
                            positive: stats ? stats.detections : 0,
                            tests: stats ? stats.tests : 0
                        };
                    }),
                    type: 'raw' as const,
                    frequencyInDays: 7,
                    dataType: 'positivity' as const
                };
            })
        )
    );

    return {
        dates,
        series: allSeries
    };
}