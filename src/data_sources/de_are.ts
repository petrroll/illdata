import { downloadCsv, getAbsolutePath } from "./ioUtils";
import type { ScalarSeries, TimeseriesData } from "../utils";
import { promises as fs } from "fs";
import path from "path";

const AGE_GROUP_ORDER = ["00+", "0-4", "5-14", "15-34", "35-59", "60+"];

export async function downloadDeAreData(filename: string = "ARE-Konsultationsinzidenz.tsv") {
    const filePath = getAbsolutePath(`./data/${filename}`);

    if (await fs.access(filePath).then(() => true).catch(() => false)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const url = `https://raw.githubusercontent.com/robert-koch-institut/ARE-Konsultationsinzidenz/main/${filename}`;
    const tsvContent = await downloadCsv(url);

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, tsvContent, "utf-8");
    console.log(`TSV downloaded and saved to ${filePath}`);
}

export function computeDeAreData(data: Record<string, string>[]): TimeseriesData {
    const groupedData = new Map<string, Map<string, number>>();
    const ageGroups = new Set<string>();

    data.forEach(row => {
        if (row["Bundesland_ID"] !== "0") return;

        const date = isoWeekToDate(row["Kalenderwoche"] || "");
        const ageGroup = row["Altersgruppe"] || "";
        const incidence = parseInt(row["ARE_Konsultationsinzidenz"] || "", 10);

        if (!date || !ageGroup || isNaN(incidence)) {
            return;
        }

        ageGroups.add(ageGroup);
        if (!groupedData.has(date)) {
            groupedData.set(date, new Map());
        }
        groupedData.get(date)!.set(ageGroup, incidence);
    });

    const dates = [...groupedData.keys()].sort();
    const orderedAgeGroups = [...ageGroups].sort((a, b) => {
        const aIndex = AGE_GROUP_ORDER.indexOf(a);
        const bIndex = AGE_GROUP_ORDER.indexOf(b);
        return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
            (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
    });

    const series: ScalarSeries[] = orderedAgeGroups.map(ageGroup => ({
        name: `ARE Consultations (${ageGroup})`,
        values: dates.map(date => ({
            virusLoad: groupedData.get(date)?.get(ageGroup) ?? 0
        })),
        type: 'raw' as const,
        frequencyInDays: 7,
        dataType: 'scalar' as const,
        valueFormat: 'number' as const
    }));

    return { dates, series };
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
