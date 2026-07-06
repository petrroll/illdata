import { downloadCsv, getAbsolutePath } from "./ioUtils";
import { computeMovingAverageTimeseries, type ScalarSeries, type TimeseriesData } from "../utils";
import { promises as fs } from "fs";
import path from "path";

const AGE_GROUP_ORDER = ["00+", "0-4", "5-14", "15-34", "35-59", "60-79", "80+"];
const AVERAGING_WINDOWS = [28];
const PATHOGEN_ORDER = ["Gesamt", "COVID-19", "Influenza", "RSV"];
const PATHOGEN_LABELS: Record<string, string> = {
    "Gesamt": "Overall SARI",
    "COVID-19": "COVID-19 SARI",
    "Influenza": "Influenza SARI",
    "RSV": "RSV SARI"
};

export async function downloadDeAreData(filename: string = "SARI-Hospitalisierungsinzidenz.tsv") {
    const filePath = getAbsolutePath(`./data/${filename}`);

    if (await fs.access(filePath).then(() => true).catch(() => false)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const url = `https://raw.githubusercontent.com/robert-koch-institut/SARI-Hospitalisierungsinzidenz/main/${filename}`;
    const tsvContent = await downloadCsv(url);

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, tsvContent, "utf-8");
    console.log(`TSV downloaded and saved to ${filePath}`);
}

export function computeDeAreData(data: Record<string, string>[]): TimeseriesData {
    const groupedData = new Map<string, Map<string, number>>();
    const ageGroups = new Set<string>();
    const pathogens = new Set<string>();

    data.forEach(row => {
        const date = isoWeekToDate(row["Kalenderwoche"] || "");
        const ageGroup = row["Altersgruppe"] || "";
        const pathogen = row["SARI"] || "";
        const incidence = parseFloat(row["Hospitalisierungsinzidenz"] || "");

        if (!date || !ageGroup || !pathogen || isNaN(incidence)) {
            return;
        }

        ageGroups.add(ageGroup);
        pathogens.add(pathogen);
        if (!groupedData.has(date)) {
            groupedData.set(date, new Map());
        }
        groupedData.get(date)!.set(seriesKey(pathogen, ageGroup), incidence);
    });

    const dates = [...groupedData.keys()].sort();
    const orderedAgeGroups = [...ageGroups].sort(compareByOrder(AGE_GROUP_ORDER));
    const orderedPathogens = [...pathogens].sort(compareByOrder(PATHOGEN_ORDER));
    const series: ScalarSeries[] = [];

    orderedAgeGroups.forEach(ageGroup => {
        orderedPathogens.forEach(pathogen => {
            const hasValue = dates.some(date => groupedData.get(date)?.has(seriesKey(pathogen, ageGroup)));
            if (!hasValue) {
                return;
            }

            series.push({
                name: `${PATHOGEN_LABELS[pathogen] ?? pathogen} Hospitalization Incidence`,
                values: dates.map(date => ({
                    virusLoad: groupedData.get(date)?.get(seriesKey(pathogen, ageGroup)) ?? 0
                })),
                type: 'raw' as const,
                frequencyInDays: 7,
                dataType: 'scalar' as const,
                valueFormat: 'number' as const,
                ageGroup
            });
        });
    });

    return computeMovingAverageTimeseries({ dates, series }, AVERAGING_WINDOWS);
}

function compareByOrder(order: string[]) {
    return (a: string, b: string) => {
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
            (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
    };
}

function seriesKey(pathogen: string, ageGroup: string): string {
    return `${pathogen}\t${ageGroup}`;
}

function isoWeekToDate(isoWeek: string): string {
    const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return "";

    const year = parseInt(match[1], 10);
    const week = parseInt(match[2], 10);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
    const monday = new Date(mondayWeek1);
    monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);

    return monday.toISOString().split("T")[0];
}
