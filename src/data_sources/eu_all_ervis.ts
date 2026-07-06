import { downloadAndSaveCsv, getAbsolutePath, toFloat } from "./ioUtils";
import type { TimeseriesData, PositivitySeries } from "../utils";

// Country name ECDC uses for the pre-aggregated Europe-wide row. This aggregate is
// unreliable for non-sentinel data (it only ships per-subtype detections and no test
// counts), so we drop it and synthesize our own aggregate from the member countries.
const AGGREGATE_COUNTRY = "EU/EEA";

export async function downloadEuEcdcData(filename: string = "nonSentinelTestsDetections.csv") {
    const filePath = getAbsolutePath(`./data/${filename}`);
    const url = `https://raw.githubusercontent.com/EU-ECDC/Respiratory_viruses_weekly_data/main/data/${filename}`;
    await downloadAndSaveCsv(url, filePath);
}

// Accumulator collected per (date, country, pathogen, survtype) combination.
interface Stats {
    tests: number;
    // Detections reported on the pathogen "total" row (pathogen === pathogentype).
    totalDetections: number;
    // Whether at least one "total" detection row was seen for this combination.
    hasTotalDetections: boolean;
    // Detections summed across pathogen subtype rows (pathogen !== pathogentype).
    subtypeDetections: number;
}

function emptyStats(): Stats {
    return { tests: 0, totalDetections: 0, hasTotalDetections: false, subtypeDetections: 0 };
}

// Detections are reported both on the pathogen "total" row and on the individual
// subtype rows. Prefer the total row when present, otherwise fall back to summing the
// subtypes (some sources, e.g. the ECDC EU/EEA aggregate or recent weeks for some
// countries, only ship subtype breakdowns without a total row).
function detectionsOf(stats: Stats): number {
    return stats.hasTotalDetections ? stats.totalDetections : stats.subtypeDetections;
}

export function computeEuEcdcData(data: Record<string, string>[], preserveSurvtype: boolean = false): TimeseriesData {
    const survtypeKeyOf = (survtype: string) => preserveSurvtype ? survtype : "all";

    // Group by date -> country -> pathogen -> survtype.
    const grouped = new Map<string, Map<string, Map<string, Map<string, Stats>>>>();

    const getStats = (datum: string, country: string, pathogen: string, survtypeKey: string): Stats => {
        let dateGroup = grouped.get(datum);
        if (!dateGroup) { dateGroup = new Map(); grouped.set(datum, dateGroup); }
        let countryGroup = dateGroup.get(country);
        if (!countryGroup) { countryGroup = new Map(); dateGroup.set(country, countryGroup); }
        let pathogenGroup = countryGroup.get(pathogen);
        if (!pathogenGroup) { pathogenGroup = new Map(); countryGroup.set(pathogen, pathogenGroup); }
        let stats = pathogenGroup.get(survtypeKey);
        if (!stats) { stats = emptyStats(); pathogenGroup.set(survtypeKey, stats); }
        return stats;
    };

    const pathogens = new Set<string>();
    const survtypes = new Set<string>();

    data.forEach(row => {
        const country = row["countryname"];
        // Skip the ECDC pre-aggregated row; we synthesize the aggregate ourselves below.
        if (!country || country === AGGREGATE_COUNTRY) return;

        // Convert yearweek (YYYY-Www) to a date.
        const yearweek = row["yearweek"];
        if (!yearweek) return;
        const [yearStr, weekStr] = yearweek.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);
        if (!Number.isFinite(year) || !Number.isFinite(week)) return;
        const date = new Date(year, 0, 1 + (week - 1) * 7);
        const datum = date.toISOString().split('T')[0];

        const pathogen = row["pathogen"];
        const survtype = row["survtype"];
        if (!pathogen || !survtype) return;

        pathogens.add(pathogen);
        survtypes.add(survtype);

        const survtypeKey = survtypeKeyOf(survtype);
        const stats = getStats(datum, country, pathogen, survtypeKey);

        const value = toFloat(row, "value");
        const isTotalRow = pathogen === row["pathogentype"];

        if (row["indicator"] === "tests") {
            // Tests are only reported at the pathogen "total" level.
            if (isTotalRow) stats.tests += value;
        } else if (row["indicator"] === "detections") {
            if (isTotalRow) {
                stats.totalDetections += value;
                stats.hasTotalDetections = true;
            } else {
                stats.subtypeDetections += value;
            }
        }
    });

    const dates = [...grouped.keys()].sort();
    const memberCountries = [...new Set(
        [...grouped.values()].flatMap(dateGroup => [...dateGroup.keys()])
    )].sort();
    const survtypeKeys = preserveSurvtype ? [...survtypes].sort() : ["all"];

    // Synthesize the Europe-wide aggregate by summing all member countries per
    // (date, pathogen, survtype). This gives us proper test counts (unlike the ECDC
    // pre-aggregated row) so non-sentinel positivity can be computed.
    dates.forEach(datum => {
        const dateGroup = grouped.get(datum)!;
        pathogens.forEach(pathogen => {
            survtypeKeys.forEach(survtypeKey => {
                let tests = 0;
                let detections = 0;
                let hasData = false;
                memberCountries.forEach(country => {
                    const stats = dateGroup.get(country)?.get(pathogen)?.get(survtypeKey);
                    if (!stats) return;
                    hasData = true;
                    tests += stats.tests;
                    detections += detectionsOf(stats);
                });
                if (!hasData) return;
                const aggregate = getStats(datum, AGGREGATE_COUNTRY, pathogen, survtypeKey);
                aggregate.tests = tests;
                aggregate.totalDetections = detections;
                aggregate.hasTotalDetections = true;
                aggregate.subtypeDetections = detections;
            });
        });
    });

    const countries = [...memberCountries, AGGREGATE_COUNTRY].sort();
    const pathogenList = [...pathogens];

    // Create series for each combination
    const allSeries: PositivitySeries[] = countries.flatMap(country =>
        pathogenList.flatMap(pathogen =>
            survtypeKeys.map(survtypeKey => {
                // Include survtype in name when preserving it to ensure unique series names
                const baseName = `${pathogen} Positivity`;
                const seriesName = preserveSurvtype && survtypeKey !== "all"
                    ? `${baseName} (${survtypeKey === "primary care sentinel" ? "Sentinel" : "Non-Sentinel"})`
                    : baseName;

                return {
                    name: seriesName,
                    country: country,
                    survtype: preserveSurvtype ? survtypeKey : undefined,
                    values: dates.map(date => {
                        const stats = grouped.get(date)?.get(country)?.get(pathogen)?.get(survtypeKey);
                        return {
                            positive: stats ? detectionsOf(stats) : 0,
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
