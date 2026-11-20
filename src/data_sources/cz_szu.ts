import { downloadBinary, downloadText, getAbsolutePath, isoWeekToDate } from "./ioUtils";
import type { PositivitySeries, TimeseriesData } from "../utils";
import { promises as fs } from "fs";
import path from "path";

// SZÚ (Státní zdravotní ústav) publishes weekly "Výsledky-viry" PDFs with laboratory
// detections of respiratory viruses in sentinel ARI samples. Each PDF contains a table
// with one column per calendar week for the last few seasons (40. KT → 39. KT).
const SZU_PAGE_URL = "https://szu.gov.cz/publikace-szu/data/akutni-respiracni-infekce-chripka/";
const SZU_PDF_LINK_PATTERN = /href="([^"]*laboratorni_vysetreni_podle_typu_viru[^"]*\.pdf)"/gi;
const SZU_PDF_WEEK_PATTERN = /(\d{1,2})_?tyden_(\d{4})/i;

/** A single positioned text item extracted from the PDF (PDF user-space units, y grows upwards). */
export interface PdfTextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Counts for one calendar week column of the SZÚ table, keyed by normalized row label. */
export interface CzSzuWeekRecord {
    year: number;
    week: number;
    counts: Record<string, number>;
}

// Normalized row label (lowercase, whitespace removed, trailing colon removed) → canonical row key
const ROW_KEYS: Record<string, string> = {
    "a": "A",
    "ah1pdm": "A H1pdm",
    "ah3": "A H3",
    "b": "B",
    "hrsv": "HRSV",
    "hadv": "HAdV",
    "hpiv": "HPIV",
    "hv": "HV",
    "mp": "MP",
    "hmpv": "HMPV",
    "cov": "CoV",
    "hrv": "HRV",
    "hbov": "hBoV",
    "ev": "EV",
    "sars-cov-2": "SARS-CoV-2",
    "sm": "SM",
    "pozitivní": "positive",
    "negativní": "negative",
    "celkem": "total",
};

// "A" contains only influenza A samples without subtype, so total influenza is the sum of all four rows.
const SERIES_DEFINITIONS: { name: string; rows: string[] }[] = [
    { name: "SARS-CoV-2 Positivity", rows: ["SARS-CoV-2"] },
    { name: "Influenza Positivity", rows: ["A", "A H1pdm", "A H3", "B"] },
    { name: "RSV Positivity", rows: ["HRSV"] },
    { name: "Rhinovirus Positivity", rows: ["HRV"] },
    { name: "Metapneumovirus Positivity", rows: ["HMPV"] },
    { name: "Adenovirus Positivity", rows: ["HAdV"] },
    { name: "Parainfluenza Positivity", rows: ["HPIV"] },
    { name: "Seasonal Coronaviruses Positivity", rows: ["CoV"] },
    { name: "Enterovirus Positivity", rows: ["EV"] },
    { name: "Mycoplasma pneumoniae Positivity", rows: ["MP"] },
];

const REQUIRED_ROWS = [...new Set([...SERIES_DEFINITIONS.flatMap(def => def.rows), "positive", "negative"])];

const WEEK_TOKEN = /^(\d{1,2})\.?$/;
const NUMBER_TOKEN = /^\d+$/;
const SEASON_TOKEN = /(\d{4})\s*\/\s*(\d{4})/g;
const MIN_WEEK_COLUMNS = 20;

export async function downloadCzSzuData(filename: string = "cz_szu_viry.pdf") {
    const filePath = getAbsolutePath(`./data/${filename}`);

    if (await fs.access(filePath).then(() => true).catch(() => false)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const html = await downloadText(SZU_PAGE_URL);
    const pdfUrl = findLatestCzSzuPdfUrl(html);
    const content = await downloadBinary(pdfUrl);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    console.log(`PDF downloaded from ${pdfUrl} and saved to ${filePath}`);
}

/** Picks the "Výsledky-viry" PDF link for the most recent calendar week from the SZÚ page HTML. */
export function findLatestCzSzuPdfUrl(html: string): string {
    let best: { url: string; order: number } | undefined;
    for (const match of html.matchAll(SZU_PDF_LINK_PATTERN)) {
        const url = new URL(match[1], SZU_PAGE_URL).toString();
        const weekMatch = url.match(SZU_PDF_WEEK_PATTERN);
        if (!weekMatch) continue;
        const order = parseInt(weekMatch[2], 10) * 100 + parseInt(weekMatch[1], 10);
        if (!best || order > best.order) {
            best = { url, order };
        }
    }
    if (!best) {
        throw new Error("No SZÚ virus results PDF link found");
    }
    return best.url;
}

export async function loadCzSzuPdfItems(filename: string): Promise<PdfTextItem[]> {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(await fs.readFile(getAbsolutePath(`./data/${filename}`)));
    const loadingTask = getDocument({ data, verbosity: 0 });
    try {
        const doc = await loadingTask.promise;
        const page = await doc.getPage(1);
        const content = await page.getTextContent();
        return content.items.flatMap(item => {
            if (!("str" in item)) return [];
            return [{
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height || Math.abs(item.transform[3]),
            }];
        });
    } finally {
        await loadingTask.destroy();
    }
}

interface Column {
    kind: "week" | "other";
    week: number;
    center: number;
    left: number;
}

interface Line {
    y: number;
    items: PdfTextItem[];
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

function center(item: PdfTextItem): number {
    return item.x + item.width / 2;
}

function groupIntoLines(items: PdfTextItem[], tolerance: number): Line[] {
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Line[] = [];
    for (const item of sorted) {
        const current = lines[lines.length - 1];
        if (current && current.y - item.y <= tolerance) {
            current.items.push(item);
        } else {
            lines.push({ y: item.y, items: [item] });
        }
    }
    lines.forEach(line => line.items.sort((a, b) => a.x - b.x));
    return lines;
}

// A header is a line with many week numbers that mostly follow each other (…, 52, 1, 2, …).
// This distinguishes it from data rows that happen to contain many small numbers.
function isHeaderLine(line: Line): boolean {
    const weeks = line.items.filter(item => isWeekToken(item.str)).map(item => parseInt(item.str, 10));
    if (weeks.length < MIN_WEEK_COLUMNS) return false;
    const consecutive = weeks.slice(1).filter((week, i) => week === weeks[i] + 1 || (week === 1 && weeks[i] >= 52)).length;
    return consecutive >= (weeks.length - 1) * 0.8;
}

function isWeekToken(str: string): boolean {
    const match = str.match(WEEK_TOKEN);
    if (!match) return false;
    const week = parseInt(match[1], 10);
    return week >= 1 && week <= 53;
}

function buildColumns(header: Line): Column[] {
    // Header tokens are either week numbers ("40.") or other column headers such as
    // "Kumulativně od 40.KT" whose values must be ignored.
    // Some headers split "40." into "40" and "."; stray punctuation is not a column.
    const tokens = header.items.filter(item => /\w/.test(item.str));
    const firstWeekIndex = tokens.findIndex(item => isWeekToken(item.str));
    const columns: Column[] = tokens.slice(firstWeekIndex).map(item => isWeekToken(item.str)
        ? { kind: "week" as const, week: parseInt(item.str, 10), center: center(item), left: 0 }
        : { kind: "other" as const, week: 0, center: center(item), left: item.x });

    // Week cells are centred under their header; other cells start at their (left-aligned) header.
    const halfPitch = (index: number): number => {
        const neighbours = [columns[index - 1], columns[index + 1]]
            .filter((col): col is Column => col?.kind === "week")
            .map(col => Math.abs(col.center - columns[index].center));
        if (neighbours.length === 0) {
            throw new Error("Cannot determine SZÚ table column width");
        }
        return Math.min(...neighbours) / 2;
    };
    columns.forEach((column, index) => {
        if (column.kind !== "week") return;
        const previous = columns[index - 1];
        column.left = previous?.kind === "week"
            ? (previous.center + column.center) / 2
            : column.center - halfPitch(index);
    });
    for (let i = 1; i < columns.length; i++) {
        if (columns[i].left < columns[i - 1].left) {
            throw new Error("SZÚ table header columns overlap");
        }
    }
    return columns;
}

function findColumn(columns: Column[], x: number, tableRight: number): Column | undefined {
    if (x < columns[0].left || x >= tableRight) return undefined;
    let found = columns[0];
    for (const column of columns) {
        if (column.left <= x) found = column;
    }
    return found;
}

function normalizeLabel(label: string): string {
    return label.toLowerCase().replace(/\s+/g, "").replace(/:$/, "");
}

/**
 * Determines the ISO year of the first week column from season labels ("2024/2025") printed above
 * the header. The per-column year labels in the SZÚ PDFs are unreliable, so they are not used.
 */
function findFirstColumnYear(lines: Line[], header: Line, fontSize: number, firstWeek: number): number {
    const startYears: number[] = [];
    for (const line of lines) {
        if (line.y <= header.y || line.y - header.y > fontSize * 6) continue;
        for (const item of line.items) {
            for (const match of item.str.matchAll(SEASON_TOKEN)) {
                const start = parseInt(match[1], 10);
                if (parseInt(match[2], 10) === start + 1) startYears.push(start);
            }
        }
    }
    if (startYears.length === 0) {
        throw new Error("SZÚ season label (e.g. 2024/2025) not found above the table header");
    }
    const firstSeasonStart = Math.min(...startYears);
    // Seasons start in week 40; weeks before that belong to the second calendar year of the season.
    return firstWeek >= 40 ? firstSeasonStart : firstSeasonStart + 1;
}

/**
 * Parses the main "results by virus type" table from positioned PDF text items.
 *
 * Values are mapped to week columns by their horizontal position, so empty cells are
 * reported as 0. Years are derived from the order of week columns: the year increases
 * whenever the week number decreases (e.g. 52 → 1).
 */
export function parseCzSzuVirusTable(rawItems: PdfTextItem[]): CzSzuWeekRecord[] {
    const items = rawItems
        .map(item => ({ ...item, str: item.str.trim() }))
        .filter(item => item.str !== "");
    const heights = items.filter(item => item.height > 0).map(item => item.height);
    if (heights.length === 0) {
        throw new Error("No text found in SZÚ PDF");
    }
    const fontSize = median(heights);
    const lines = groupIntoLines(items, fontSize * 0.4);

    for (let h = 0; h < lines.length; h++) {
        const header = lines[h];
        if (!isHeaderLine(header)) continue;

        const columns = buildColumns(header);
        const weekColumns = columns.filter(col => col.kind === "week");
        const lastColumn = columns[columns.length - 1];
        const tableRight = lastColumn.kind === "week"
            ? lastColumn.center + (lastColumn.center - lastColumn.left)
            : Infinity;

        const rows = new Map<string, Map<Column, number>>();
        // The table ends at the next header or at a large vertical gap (charts follow below it).
        for (let l = h + 1; l < lines.length && !isHeaderLine(lines[l]) && lines[l - 1].y - lines[l].y < fontSize * 4; l++) {
            const labelParts = lines[l].items.filter(item => center(item) < columns[0].left);
            const rowKey = ROW_KEYS[normalizeLabel(labelParts.map(item => item.str).join(""))];
            if (!rowKey) continue;
            if (rows.has(rowKey)) {
                throw new Error(`Duplicate SZÚ table row: ${rowKey}`);
            }
            const values = new Map<Column, number>();
            for (const item of lines[l].items) {
                if (labelParts.includes(item) || !NUMBER_TOKEN.test(item.str)) continue;
                const column = findColumn(columns, center(item), tableRight);
                if (!column || column.kind !== "week") continue;
                if (values.has(column)) {
                    throw new Error(`Multiple values for week ${column.week} in SZÚ row ${rowKey}`);
                }
                values.set(column, parseInt(item.str, 10));
            }
            rows.set(rowKey, values);
            if (rowKey === "total") break;
        }

        if (!rows.has("SARS-CoV-2")) continue;
        const missing = REQUIRED_ROWS.filter(row => !rows.has(row));
        if (missing.length > 0) {
            throw new Error(`SZÚ table is missing rows: ${missing.join(", ")}`);
        }

        let year = findFirstColumnYear(lines, header, fontSize, weekColumns[0].week);
        return weekColumns.map((column, index) => {
            if (index > 0 && column.week < weekColumns[index - 1].week) {
                year++;
            }
            const counts: Record<string, number> = {};
            rows.forEach((values, rowKey) => {
                const value = values.get(column);
                // Empty cells mean zero detections; the "Celkem" row may contain "####" so it stays missing.
                if (value !== undefined || rowKey !== "total") {
                    counts[rowKey] = value ?? 0;
                }
            });
            return { year, week: column.week, counts };
        });
    }

    throw new Error("SZÚ virus results table not found in PDF");
}

export function computeCzSzuData(records: CzSzuWeekRecord[], now: Date = new Date()): TimeseriesData {
    const weeks = records.map(record => {
        const positive = record.counts["positive"] ?? 0;
        const negative = record.counts["negative"] ?? 0;
        const tests = positive + negative > 0 ? positive + negative : (record.counts["total"] ?? 0);
        const total = record.counts["total"];
        if (total !== undefined && total > 0 && total !== tests) {
            console.warn(`SZÚ ${record.year}-W${record.week}: positive + negative (${tests}) differs from total (${total})`);
        }
        return { date: isoWeekToDate(record.year, record.week), counts: record.counts, tests };
    }).sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 1; i < weeks.length; i++) {
        if (weeks[i].date === weeks[i - 1].date) {
            throw new Error(`Duplicate SZÚ week ${weeks[i].date}; year assignment is inconsistent`);
        }
    }

    // Weeks without any tests at the start or end (e.g. future weeks of the current season) are not data.
    const first = weeks.findIndex(week => week.tests > 0);
    if (first === -1) {
        throw new Error("SZÚ table contains no tested samples");
    }
    let last = weeks.length - 1;
    while (weeks[last].tests === 0) last--;
    const usedWeeks = weeks.slice(first, last + 1);

    const latestDate = usedWeeks[usedWeeks.length - 1].date;
    if (new Date(`${latestDate}T00:00:00Z`).getTime() > now.getTime()) {
        throw new Error(`SZÚ data contains a week in the future (${latestDate}); year assignment is inconsistent`);
    }

    const series: PositivitySeries[] = SERIES_DEFINITIONS.map(def => ({
        name: def.name,
        values: usedWeeks.map(week => {
            const positive = def.rows.reduce((sum, row) => sum + (week.counts[row] ?? 0), 0);
            if (positive > week.tests) {
                throw new Error(`SZÚ ${def.name} on ${week.date}: ${positive} detections exceed ${week.tests} tests`);
            }
            return { positive, tests: week.tests };
        }),
        type: 'raw' as const,
        frequencyInDays: 7,
        dataType: 'positivity' as const
    }));

    return { dates: usedWeeks.map(week => week.date), series };
}
