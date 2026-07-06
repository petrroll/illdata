import { computeEuEcdcData } from './eu_all_ervis';
import type { PositivitySeries } from '../utils';

// Helper to build a raw ECDC row with sane defaults.
function row(overrides: Partial<Record<string, string>>): Record<string, string> {
    return {
        survtype: 'non-sentinel',
        countryname: 'Spain',
        yearweek: '2026-W20',
        pathogen: 'Influenza',
        pathogentype: 'Influenza',
        pathogensubtype: 'total',
        indicator: 'detections',
        age: 'total',
        value: '0',
        ...overrides,
    };
}

function seriesFor(series: PositivitySeries[], country: string, name: string): PositivitySeries {
    const match = series.find(s => s.country === country && s.name === name);
    if (!match) throw new Error(`series not found: ${country} / ${name}`);
    return match;
}

describe('computeEuEcdcData Tests', () => {
    test('uses pathogen total rows for detections and tests', () => {
        const input = [
            row({ pathogen: 'Influenza', pathogentype: 'Influenza', indicator: 'detections', value: '5' }),
            row({ pathogen: 'Influenza', pathogentype: 'Influenza', indicator: 'tests', value: '100' }),
        ];

        const result = computeEuEcdcData(input, true);
        const spain = seriesFor(result.series as PositivitySeries[], 'Spain', 'Influenza Positivity (Non-Sentinel)');
        const idx = result.dates.length - 1;
        expect(spain.values[idx]).toEqual({ positive: 5, tests: 100 });
    });

    test('falls back to summing subtype detections when no total row exists', () => {
        // Spain reports only subtype detections for this week (no pathogen total row),
        // but still ships the pathogen-level test count.
        const input = [
            row({ pathogen: 'Influenza', pathogentype: 'Influenza A', pathogensubtype: 'A(H3)', indicator: 'detections', value: '3' }),
            row({ pathogen: 'Influenza', pathogentype: 'Influenza B', pathogensubtype: 'B/Vic', indicator: 'detections', value: '4' }),
            row({ pathogen: 'Influenza', pathogentype: 'Influenza', pathogensubtype: 'total', indicator: 'tests', value: '100' }),
        ];

        const result = computeEuEcdcData(input, true);
        const spain = seriesFor(result.series as PositivitySeries[], 'Spain', 'Influenza Positivity (Non-Sentinel)');
        const idx = result.dates.length - 1;
        // 3 + 4 subtype detections, tests still available at the total level.
        expect(spain.values[idx]).toEqual({ positive: 7, tests: 100 });
    });

    test('does not double count when both total and subtype detection rows exist', () => {
        const input = [
            row({ pathogen: 'Influenza', pathogentype: 'Influenza', pathogensubtype: 'total', indicator: 'detections', value: '7' }),
            row({ pathogen: 'Influenza', pathogentype: 'Influenza A', pathogensubtype: 'A(H3)', indicator: 'detections', value: '3' }),
            row({ pathogen: 'Influenza', pathogentype: 'Influenza B', pathogensubtype: 'B/Vic', indicator: 'detections', value: '4' }),
            row({ pathogen: 'Influenza', pathogentype: 'Influenza', pathogensubtype: 'total', indicator: 'tests', value: '100' }),
        ];

        const result = computeEuEcdcData(input, true);
        const spain = seriesFor(result.series as PositivitySeries[], 'Spain', 'Influenza Positivity (Non-Sentinel)');
        const idx = result.dates.length - 1;
        // Uses the total row (7), not total + subtypes (14).
        expect(spain.values[idx]).toEqual({ positive: 7, tests: 100 });
    });

    test('synthesizes the EU/EEA aggregate from member countries with real test counts', () => {
        const input = [
            row({ countryname: 'Spain', pathogen: 'Influenza', pathogentype: 'Influenza', indicator: 'detections', value: '5' }),
            row({ countryname: 'Spain', pathogen: 'Influenza', pathogentype: 'Influenza', indicator: 'tests', value: '100' }),
            row({ countryname: 'Austria', pathogen: 'Influenza', pathogentype: 'Influenza', indicator: 'detections', value: '2' }),
            row({ countryname: 'Austria', pathogen: 'Influenza', pathogentype: 'Influenza', indicator: 'tests', value: '50' }),
        ];

        const result = computeEuEcdcData(input, true);
        const eu = seriesFor(result.series as PositivitySeries[], 'EU/EEA', 'Influenza Positivity (Non-Sentinel)');
        const idx = result.dates.length - 1;
        expect(eu.values[idx]).toEqual({ positive: 7, tests: 150 });
    });

    test('ignores the ECDC pre-aggregated EU/EEA row (which lacks tests) and rebuilds it', () => {
        const input = [
            // ECDC-provided aggregate: only subtype detections, no tests.
            row({ countryname: 'EU/EEA', pathogen: 'Influenza', pathogentype: 'Influenza A', pathogensubtype: 'A(H3)', indicator: 'detections', value: '999' }),
            // Member countries with proper totals + tests.
            row({ countryname: 'Spain', pathogen: 'Influenza', pathogentype: 'Influenza', indicator: 'detections', value: '5' }),
            row({ countryname: 'Spain', pathogen: 'Influenza', pathogentype: 'Influenza', indicator: 'tests', value: '100' }),
        ];

        const result = computeEuEcdcData(input, true);
        const eu = seriesFor(result.series as PositivitySeries[], 'EU/EEA', 'Influenza Positivity (Non-Sentinel)');
        const idx = result.dates.length - 1;
        // The synthesized aggregate equals the member-country sum, not the 999 ECDC row.
        expect(eu.values[idx]).toEqual({ positive: 5, tests: 100 });
    });

    test('precomputes filter trend suffixes by country and surveillance type', () => {
        const weeks = ['2026-W01', '2026-W02', '2026-W03', '2026-W04', '2026-W05', '2026-W06', '2026-W07', '2026-W08'];
        const input = weeks.flatMap((yearweek, index) => [
            row({
                countryname: 'Spain',
                survtype: 'primary care sentinel',
                yearweek,
                pathogen: 'Influenza',
                pathogentype: 'Influenza',
                indicator: 'detections',
                value: (index < 4 ? 1 : 4).toString()
            }),
            row({
                countryname: 'Spain',
                survtype: 'primary care sentinel',
                yearweek,
                pathogen: 'Influenza',
                pathogentype: 'Influenza',
                indicator: 'tests',
                value: '100'
            }),
            row({
                countryname: 'Spain',
                survtype: 'non-sentinel',
                yearweek,
                pathogen: 'RSV',
                pathogentype: 'RSV',
                indicator: 'detections',
                value: (index < 4 ? 4 : 1).toString()
            }),
            row({
                countryname: 'Spain',
                survtype: 'non-sentinel',
                yearweek,
                pathogen: 'RSV',
                pathogentype: 'RSV',
                indicator: 'tests',
                value: '100'
            }),
        ]);

        const result = computeEuEcdcData(input, true);

        expect(result.filterTrendSuffixes?.countries['primary care sentinel'].Spain[0]).toMatchObject({
            letter: 'I',
            trend: 'positive'
        });
        expect(result.filterTrendSuffixes?.survtypes.Spain['non-sentinel'][1]).toMatchObject({
            letter: 'R',
            trend: 'negative'
        });
        expect(result.filterTrendSuffixes?.survtypes.Spain['primary care sentinel']).toHaveLength(3);
    });
});
