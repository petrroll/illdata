import { promises as fs } from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import { getAbsolutePath } from "./ioUtils";
import type { PositivitySeries, TimeseriesData } from "../utils";

const SZU_ARI_PAGE_URL = "https://szu.gov.cz/publikace-szu/data/akutni-respiracni-infekce-chripka/";
const MAX_WEEKLY_TESTS = 100000;

export interface SzuVirusPdfEntry {
    year: number;
    week: number;
    url: string;
}

export interface SzuVirusDetectionRow {
    date: string;
    pathogen: string;
    positive: number;
    tests: number;
    sourceUrl: string;
}

interface VirusDefinition {
    name: string;
    regex: RegExp;
}

const VIRUS_DEFINITIONS: VirusDefinition[] = [
    { name: "SARS-CoV-2", regex: /\bSARS\s*[- ]?CoV\s*[- ]?2\b/i },
    { name: "Influenza A", regex: /\b(?:ch[řr]ipka|influenza)\s*A\b|\bA\s*\(\s*H[135N\s]+\)/i },
    { name: "Influenza B", regex: /\b(?:ch[řr]ipka|influenza)\s*B\b/i },
    { name: "RSV", regex: /\bRSV\b|respira[čc]n[íi]\s+syncyti[áa]ln[íi]\s+virus/i },
    { name: "Adenovirus", regex: /adenovir/i },
    { name: "Rhinovirus", regex: /rhinovir|rinovir/i },
    { name: "Parainfluenza", regex: /parainflu/i },
    { name: "Metapneumovirus", regex: /metapneumovir/i },
    { name: "Bocavirus", regex: /bocavir/i },
    { name: "Enterovirus", regex: /enterovir/i },
    { name: "Seasonal Coronaviruses", regex: /\bcoronavir/i },
];
const NUMBER_TOKEN_PATTERN = /\d(?:[ \u00a0]\d{3})+|\d{1,5}/g;

export async function downloadCzSzuAriVirusesData(filename: string = "cz_szu_ari_viruses.json") {
    const filePath = getAbsolutePath(`./data/${filename}`);
    if (await fs.access(filePath).then(() => true).catch(() => false)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const html = await fetchTextWithRetries(SZU_ARI_PAGE_URL);
    const entries = extractVirusPdfEntries(html, SZU_ARI_PAGE_URL);
    if (entries.length === 0) {
        throw new Error("No SZU Výsledky-viry PDF links found on ARI page");
    }

    const rows: SzuVirusDetectionRow[] = [];
    for (const entry of entries) {
        try {
            const pdfBytes = await fetchBytesWithRetries(entry.url);
            const text = await extractPdfText(pdfBytes);
            rows.push(...parseVirusResultPdfText(text, entry));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Skipping SZU virus PDF ${entry.url}: ${message}`);
        }
    }

    if (rows.length === 0) {
        throw new Error("No SZU virus detections could be parsed from Výsledky-viry PDFs");
    }

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(rows, null, 2), "utf-8");
    console.log(`SZU virus data downloaded and saved to ${filePath}`);
}

export function extractVirusPdfEntries(html: string, pageUrl: string = SZU_ARI_PAGE_URL): SzuVirusPdfEntry[] {
    const entries: SzuVirusPdfEntry[] = [];
    const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => match[1]);
    const candidates = rows.length > 0 ? rows : [html];

    for (const candidate of candidates) {
        collectEntriesFromHtmlFragment(candidate, pageUrl, entries);
    }

    if (entries.length === 0) {
        collectEntriesFromHtmlFragment(html, pageUrl, entries);
    }

    const unique = new Map<string, SzuVirusPdfEntry>();
    for (const entry of entries) {
        unique.set(entry.url, entry);
    }
    return [...unique.values()].sort((a, b) => a.year - b.year || a.week - b.week);
}

function collectEntriesFromHtmlFragment(fragment: string, pageUrl: string, entries: SzuVirusPdfEntry[]) {
    const text = stripHtml(fragment);
    const weekMatch = text.match(/(\d{1,2})\s*\.\s*KT\s*(\d{4})/i) ?? fragment.match(/(?:^|[^\d])(\d{4})[-_ ]?(\d{1,2})(?:[^\d]|$)/);
    if (!weekMatch) return;

    const isKtMatch = weekMatch[0].toLowerCase().includes("kt");
    const week = parseInt(isKtMatch ? weekMatch[1] : weekMatch[2], 10);
    const year = parseInt(isKtMatch ? weekMatch[2] : weekMatch[1], 10);
    if (!Number.isFinite(year) || !Number.isFinite(week)) return;

    const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const linkMatch of fragment.matchAll(linkRegex)) {
        const href = decodeHtml(linkMatch[1]);
        const label = stripHtml(linkMatch[2]);
        const normalized = removeDiacritics(`${href} ${label}`).toLowerCase();
        if (!normalized.includes("vysledky") || !normalized.includes("viry") || !href.toLowerCase().includes(".pdf")) {
            continue;
        }
        entries.push({ year, week, url: new URL(href, pageUrl).toString() });
    }
}

export function parseVirusResultPdfText(text: string, entry: SzuVirusPdfEntry): SzuVirusDetectionRow[] {
    const tests = extractTestCount(text, entry);
    if (!tests || tests <= 0) {
        throw new Error(`Cannot find total tested sample count for ${entry.week}.KT ${entry.year}`);
    }
    if (tests > MAX_WEEKLY_TESTS) {
        throw new Error(`Implausible tested sample count ${tests} for ${entry.week}.KT ${entry.year}`);
    }

    const counts = extractVirusCounts(text);
    if (counts.size === 0) {
        throw new Error(`Cannot find virus result counts for ${entry.week}.KT ${entry.year}`);
    }

    const date = isoWeekStartDate(entry.year, entry.week);
    return [...counts.entries()]
        .filter(([, positive]) => positive > 0)
        .map(([pathogen, positive]) => ({
            date,
            pathogen: aggregatePathogenName(pathogen),
            positive,
            tests,
            sourceUrl: entry.url,
        }));
}

export function computeCzSzuAriVirusesData(rows: SzuVirusDetectionRow[]): TimeseriesData {
    const grouped = new Map<string, Map<string, { positive: number, tests: number }>>();
    const testsByDate = new Map<string, number>();
    const pathogens = new Set<string>();

    for (const row of rows) {
        if (!row.date || !row.pathogen || !Number.isFinite(row.positive) || !Number.isFinite(row.tests) || row.tests <= 0 || row.tests > MAX_WEEKLY_TESTS) {
            continue;
        }
        const pathogen = aggregatePathogenName(row.pathogen);
        pathogens.add(pathogen);
        testsByDate.set(row.date, Math.max(testsByDate.get(row.date) ?? 0, row.tests));
        let dateGroup = grouped.get(row.date);
        if (!dateGroup) { dateGroup = new Map(); grouped.set(row.date, dateGroup); }
        let stats = dateGroup.get(pathogen);
        if (!stats) { stats = { positive: 0, tests: 0 }; dateGroup.set(pathogen, stats); }
        stats.positive += row.positive;
        stats.tests = Math.max(stats.tests, row.tests);
    }

    const dates = [...grouped.keys()].sort();
    const series: PositivitySeries[] = [...pathogens].sort().map(pathogen => ({
        name: `${pathogen} Positivity`,
        values: dates.map(date => {
            const stats = grouped.get(date)?.get(pathogen);
            return {
                positive: stats ? stats.positive : 0,
                tests: stats ? stats.tests : testsByDate.get(date) ?? 0,
            };
        }),
        type: "raw" as const,
        frequencyInDays: 7,
        dataType: "positivity" as const,
    }));

    return { dates, series };
}

function extractVirusCounts(text: string): Map<string, number> {
    const counts = extractCountsFromColumnTable(text);
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    for (const line of lines) {
        for (const definition of VIRUS_DEFINITIONS) {
            if (definition.name === "Seasonal Coronaviruses" && /SARS\s*[- ]?CoV\s*[- ]?2/i.test(line)) continue;
            const match = definition.regex.exec(line);
            if (!match) continue;
            const tail = line.slice(match.index + match[0].length);
            const numbers = extractIntegers(tail);
            if (numbers.length === 0) continue;
            const value = selectCurrentWeekValue(numbers);
            counts.set(definition.name, Math.max(counts.get(definition.name) ?? 0, value));
        }
    }

    return counts;
}

function extractCountsFromColumnTable(text: string): Map<string, number> {
    const counts = new Map<string, number>();
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
        const labels = VIRUS_DEFINITIONS
            .map(definition => {
                const match = definition.regex.exec(lines[i]);
                return match ? { name: definition.name, index: match.index } : undefined;
            })
            .filter((item): item is { name: string, index: number } => item !== undefined)
            .sort((a, b) => a.index - b.index);

        if (labels.length < 2) continue;

        const valueLine = lines.slice(i + 1, i + 6).find(line => /pozitiv|celkem|záchyt|zachyt/i.test(removeDiacritics(line)) && extractIntegers(line).length >= labels.length);
        if (!valueLine) continue;

        const numbers = extractIntegers(valueLine).slice(-labels.length);
        labels.forEach((label, index) => counts.set(label.name, Math.max(counts.get(label.name) ?? 0, numbers[index] ?? 0)));
    }

    return counts;
}

function extractTestCount(text: string, entry: SzuVirusPdfEntry): number | undefined {
    const lines = removeDiacritics(text)
        .split(/\r?\n/)
        .map(line => line.replace(/\s+/g, " ").trim())
        .filter(Boolean);

    for (const line of lines) {
        if (!/(?:vysetren|vzorku|vzorku|testu|testovan)/i.test(line)) continue;
        const numbers = extractIntegers(line);
        const plausibleCounts = numbers.filter(value => value < MAX_WEEKLY_TESTS && value !== entry.year && value !== entry.week);
        if (plausibleCounts.length > 0) return selectCurrentWeekValue(plausibleCounts);
    }

    const normalized = lines.join(" ");
    const numberPattern = NUMBER_TOKEN_PATTERN.source;
    const patterns = [
        new RegExp(`celkem\\s+(?:bylo\\s+)?(?:vysetreno|vysetrenych|vysetreni)\\D{0,80}(${numberPattern})`, "i"),
        new RegExp(`(?:pocet|celkem)\\s+(?:vysetrenych\\s+)?(?:vzorku|vzorku|vysetreni)\\D{0,80}(${numberPattern})`, "i"),
        new RegExp(`vysetreno\\s+(?:bylo\\s+)?\\D{0,80}(${numberPattern})\\s+(?:vzorku|vzorku|osob|pacientu)`, "i"),
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) return parseInt(match[1].replace(/\s/g, ""), 10);
    }
    return undefined;
}

function extractIntegers(text: string): number[] {
    return [...text.matchAll(NUMBER_TOKEN_PATTERN)].map(match => parseInt(match[0].replace(/[ \u00a0]/g, ""), 10));
}

function selectCurrentWeekValue(numbers: number[]): number {
    if (numbers.length >= 2) {
        const current = numbers[numbers.length - 2];
        const trailingTotal = numbers[numbers.length - 1];
        if (trailingTotal >= current) {
            return current;
        }
    }
    return numbers[numbers.length - 1];
}

function aggregatePathogenName(pathogen: string): string {
    if (pathogen === "Influenza A" || pathogen === "Influenza B") return "Influenza";
    if (pathogen === "Coronavirus" || pathogen === "Seasonal Coronavirus") return "Seasonal Coronaviruses";
    return pathogen;
}

function isoWeekStartDate(year: number, week: number): string {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
    mondayWeek1.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
    return mondayWeek1.toISOString().split("T")[0];
}

async function extractPdfText(data: Uint8Array): Promise<string> {
    const parser = new PDFParse({ data });
    try {
        const result = await parser.getText();
        return result.text;
    } finally {
        await parser.destroy();
    }
}

async function fetchTextWithRetries(url: string): Promise<string> {
    const bytes = await fetchBytesWithRetries(url);
    return new TextDecoder().decode(bytes);
}

async function fetchBytesWithRetries(url: string, retries: number = 3, retryDelayMs: number = 1000): Promise<Uint8Array> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, { headers: { "User-Agent": "illmeter data processor" } });
            if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.length === 0) throw new Error("Fetched content is empty");
            return bytes;
        } catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Download attempt ${attempt}/${retries} for ${url} failed: ${message}`);
            if (attempt < retries) await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
    }
    throw new Error(`Failed to download ${url} after ${retries} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function stripHtml(html: string): string {
    return decodeHtml(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtml(text: string): string {
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#039;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function removeDiacritics(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
