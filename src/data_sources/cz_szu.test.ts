import { computeCzSzuData, findLatestCzSzuPdfUrl, parseCzSzuVirusTable, type CzSzuWeekRecord, type PdfTextItem } from './cz_szu';
import { isoWeekToDate } from './ioUtils';
import type { PositivitySeries } from '../utils';

const FONT = 1.56;
const PITCH = 4.8;
const HEADER_Y = 500;
const ROW_LABELS = ['A', 'A H1pdm', 'A H3', 'B', 'HRSV', 'HAdV', 'HPIV', 'HV', 'MP', 'HMPV', 'CoV', 'HRV', 'hBoV', 'EV', 'SARS-CoV-2', 'SM', 'pozitivní', 'negativní', 'Celkem:'];
const SEASON_WEEKS = [...Array.from({ length: 13 }, (_, i) => 40 + i), ...Array.from({ length: 39 }, (_, i) => 1 + i)];

type HeaderToken = number | string;
type Cells = Record<string, Record<number, string>>;

function text(str: string, x: number, y: number, height = FONT): PdfTextItem {
    return { str, x, y, width: str.length * 0.78, height };
}

function centered(str: string, centerX: number, y: number): PdfTextItem {
    const item = text(str, 0, y);
    return { ...item, x: centerX - item.width / 2 };
}

function rowY(label: string): number {
    return HEADER_Y - 2.28 * (ROW_LABELS.indexOf(label) + 1);
}

/**
 * Builds positioned text items resembling the SZÚ "výsledky viry" PDF table.
 * `cells` maps a row label to { headerTokenIndex: cellText }; blank cells are simply absent.
 */
function buildTable(header: HeaderToken[], cells: Cells, seasonLabel = '2024/2025'): PdfTextItem[] {
    const items: PdfTextItem[] = [text(seasonLabel, 42, HEADER_Y + 3.6)];
    const centers = header.map((_, i) => 43 + i * PITCH);
    header.forEach((token, i) => {
        items.push(typeof token === 'number'
            ? centered(`${token}.`, centers[i], HEADER_Y)
            : text(token, centers[i] - 1, HEADER_Y));
    });
    ROW_LABELS.forEach(label => {
        const y = rowY(label);
        if (label === 'A H1pdm') {
            // Subscripted labels are split into several items with slightly lower baselines.
            items.push(text('A H', 19.2, y), text('1', 21.72, y - 0.24, 1.08), text('pdm', 22.32, y));
        } else if (label === 'A H3') {
            items.push(text('A H', 19.2, y), text('3', 21.72, y - 0.24, 1.08));
        } else {
            items.push(text(label, 19.2, label === 'pozitivní' || label === 'negativní' ? y - 0.12 : y, label.startsWith('poz') || label.startsWith('neg') ? 1.8 : FONT));
        }
        Object.entries(cells[label] ?? {}).forEach(([index, value]) => {
            const column = Number(index);
            items.push(typeof header[column] === 'number'
                ? centered(value, centers[column], y)
                : text(value, centers[column] - 1, y));
        });
    });
    // Unrelated chart legend below the table that must not be read as table rows
    items.push(text('A', 30, HEADER_Y - 80), text('SARS-CoV-2', 60, HEADER_Y - 80));
    return items;
}

function columnsFor(header: HeaderToken[], predicate: (token: HeaderToken, index: number) => boolean): number[] {
    return header.flatMap((token, index) => predicate(token, index) ? [index] : []);
}

function fill(indexes: number[], value: (index: number) => string): Record<number, string> {
    return Object.fromEntries(indexes.map(index => [index, value(index)]));
}

describe('parseCzSzuVirusTable', () => {
    test('assigns ISO years from week order across several seasons, ignoring cumulative columns', () => {
        const header: HeaderToken[] = [...SEASON_WEEKS, ...SEASON_WEEKS, 'Kumulativně', ...SEASON_WEEKS, 'Kumulativně'];
        const weekColumns = columnsFor(header, token => typeof token === 'number');
        const cumulativeColumns = columnsFor(header, token => typeof token === 'string');
        const items = buildTable(header, {
            'SARS-CoV-2': { ...fill(weekColumns, () => '1'), ...fill(cumulativeColumns, () => '9999') },
            'pozitivní': fill(weekColumns, () => '2'),
            'negativní': fill(weekColumns, () => '8'),
        });

        const records = parseCzSzuVirusTable(items);

        expect(records).toHaveLength(SEASON_WEEKS.length * 3);
        expect(records.slice(0, 2).map(r => [r.year, r.week])).toEqual([[2024, 40], [2024, 41]]);
        expect(records.slice(12, 14).map(r => [r.year, r.week])).toEqual([[2024, 52], [2025, 1]]);
        // 39 → 40 is a season boundary inside the same calendar year
        expect(records.slice(51, 53).map(r => [r.year, r.week])).toEqual([[2025, 39], [2025, 40]]);
        expect(records.slice(103, 105).map(r => [r.year, r.week])).toEqual([[2026, 39], [2026, 40]]);
        expect(records.slice(116, 118).map(r => [r.year, r.week])).toEqual([[2026, 52], [2027, 1]]);
        expect(records.at(-1)).toMatchObject({ year: 2027, week: 39 });
        expect(records.every(r => r.counts['SARS-CoV-2'] === 1)).toBe(true);
    });

    test('handles a week 53 column', () => {
        const weeks = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 1, 2, 3, 4, 5, 6, 7, 8];
        const records = parseCzSzuVirusTable(buildTable(weeks, { 'SARS-CoV-2': { 13: '4' } }, '2026/2027'));

        expect(records.slice(12, 15).map(r => [r.year, r.week])).toEqual([[2026, 52], [2026, 53], [2027, 1]]);
        expect(records[13].counts['SARS-CoV-2']).toBe(4);
    });

    test('derives the year for a header that starts before week 40', () => {
        const weeks = Array.from({ length: 30 }, (_, i) => 10 + i);
        const records = parseCzSzuVirusTable(buildTable(weeks, {}, '2025/2026'));

        expect(records[0]).toMatchObject({ year: 2026, week: 10 });
    });

    test('maps values to columns by position, treating blank cells as zero', () => {
        const items = buildTable(SEASON_WEEKS, {
            'A': { 0: '3' },
            'A H1pdm': { 0: '4', 2: '1' },
            'A H3': { 1: '5' },
            'SARS-CoV-2': { 0: '108', 2: '75' },
            'pozitivní': { 0: '227', 1: '5', 2: '254' },
            'negativní': { 0: '849', 1: '95', 2: '1051' },
            'Celkem:': { 0: '1076', 1: '####', 2: '1305' },
        });

        const records = parseCzSzuVirusTable(items);

        expect(records[0].counts).toMatchObject({ 'A': 3, 'A H1pdm': 4, 'A H3': 0, 'SARS-CoV-2': 108, positive: 227, negative: 849, total: 1076 });
        expect(records[1].counts).toMatchObject({ 'A': 0, 'A H1pdm': 0, 'A H3': 5, 'SARS-CoV-2': 0, positive: 5, negative: 95 });
        expect(records[1].counts.total).toBeUndefined();
        expect(records[2].counts).toMatchObject({ 'A H1pdm': 1, 'SARS-CoV-2': 75, total: 1305 });
    });

    test('ignores "40" "." split tokens and data rows that look like headers', () => {
        const items = buildTable(SEASON_WEEKS, { 'HRV': fill(SEASON_WEEKS.map((_, i) => i), i => String((i * 7) % 50 + 1)) });
        const splitHeader = SEASON_WEEKS.flatMap((week, i) => [text(String(week), 42 + i * PITCH, HEADER_Y + 20), text('.', 43.7 + i * PITCH, HEADER_Y + 20)]);

        const records = parseCzSzuVirusTable([...splitHeader, ...items]);

        expect(records).toHaveLength(SEASON_WEEKS.length);
        expect(records[3].counts['HRV']).toBe(22);
    });

    test('throws when expected rows are missing', () => {
        const items = buildTable(SEASON_WEEKS, {}).filter(item => item.str !== 'HMPV');

        expect(() => parseCzSzuVirusTable(items)).toThrow('missing rows: HMPV');
    });

    test('throws when the table is not present', () => {
        expect(() => parseCzSzuVirusTable([text('1', 10, 10)])).toThrow('table not found');
    });
});

function record(year: number, week: number, counts: Record<string, number>): CzSzuWeekRecord {
    return { year, week, counts: { 'A': 0, 'A H1pdm': 0, 'A H3': 0, 'B': 0, ...counts } };
}

describe('computeCzSzuData', () => {
    const now = new Date('2025-01-20T12:00:00Z');

    test('computes per-virus positivity on ISO week Monday dates across the year change', () => {
        const result = computeCzSzuData([
            record(2024, 52, { 'A': 130, 'A H1pdm': 17, 'A H3': 4, 'B': 2, 'SARS-CoV-2': 29, positive: 300, negative: 1107, total: 1407 }),
            record(2025, 1, { 'A': 1, 'SARS-CoV-2': 25, positive: 30, negative: 70 }),
            record(2025, 2, { positive: 0, negative: 0 }),
        ], now);

        expect(result.dates).toEqual(['2024-12-23', '2024-12-30']);
        const byName = (name: string) => result.series.find(s => s.name === name) as PositivitySeries;
        expect(byName('Influenza Positivity').values).toEqual([{ positive: 153, tests: 1407 }, { positive: 1, tests: 100 }]);
        expect(byName('SARS-CoV-2 Positivity').values).toEqual([{ positive: 29, tests: 1407 }, { positive: 25, tests: 100 }]);
        expect(byName('RSV Positivity').values).toEqual([{ positive: 0, tests: 1407 }, { positive: 0, tests: 100 }]);
        expect(result.series.every(s => s.type === 'raw' && s.frequencyInDays === 7 && s.dataType === 'positivity')).toBe(true);
        expect(result.series.map(s => s.name)).toContain('Seasonal Coronaviruses Positivity');
    });

    test('sorts weeks chronologically and keeps zero-test weeks between data', () => {
        const result = computeCzSzuData([
            record(2025, 1, { positive: 1, negative: 9 }),
            record(2024, 51, { positive: 1, negative: 9 }),
            record(2024, 52, { positive: 0, negative: 0 }),
        ], now);

        expect(result.dates).toEqual(['2024-12-16', '2024-12-23', '2024-12-30']);
        expect(result.series[0].values[1]).toEqual({ positive: 0, tests: 0 });
    });

    test('falls back to the total row when positive and negative counts are missing', () => {
        const result = computeCzSzuData([record(2025, 1, { total: 50 })], now);

        expect(result.series[0].values).toEqual([{ positive: 0, tests: 50 }]);
    });

    test('throws on data dated in the future (wrong year assignment)', () => {
        expect(() => computeCzSzuData([record(2025, 10, { positive: 1, negative: 9 })], now)).toThrow('future');
    });

    test('throws on duplicate weeks', () => {
        expect(() => computeCzSzuData([
            record(2024, 50, { positive: 1, negative: 9 }),
            record(2024, 50, { positive: 1, negative: 9 }),
        ], now)).toThrow('Duplicate');
    });

    test('throws when detections exceed tested samples', () => {
        expect(() => computeCzSzuData([record(2025, 1, { 'SARS-CoV-2': 20, positive: 5, negative: 5 })], now)).toThrow('exceed');
    });
});

describe('findLatestCzSzuPdfUrl', () => {
    test('picks the most recent week, including across a year change', () => {
        const html = `
            <a href="https://szu.gov.cz/wp-content/uploads/2027/01/laboratorni_vysetreni_podle_typu_viru_1_tyden_2027.pdf">Výsledky-viry</a>
            <a href="https://szu.gov.cz/wp-content/uploads/2026/12/laboratorni_vysetreni_podle_typu_viru_52_tyden_2026.pdf">Výsledky-viry</a>
            <a href="https://szu.gov.cz/wp-content/uploads/2026/12/laboratorni_vysetreni_podle_kraju_2_tyden_2027.pdf">Výsledky-kraje</a>`;

        expect(findLatestCzSzuPdfUrl(html)).toBe('https://szu.gov.cz/wp-content/uploads/2027/01/laboratorni_vysetreni_podle_typu_viru_1_tyden_2027.pdf');
    });

    test('throws when no link is found', () => {
        expect(() => findLatestCzSzuPdfUrl('<html></html>')).toThrow();
    });
});

describe('isoWeekToDate', () => {
    test('returns the Monday of ISO weeks around year changes', () => {
        expect(isoWeekToDate(2025, 1)).toBe('2024-12-30');
        expect(isoWeekToDate(2024, 40)).toBe('2024-09-30');
        expect(isoWeekToDate(2026, 53)).toBe('2026-12-28');
        expect(isoWeekToDate(2027, 1)).toBe('2027-01-04');
    });
});
