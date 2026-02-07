import { computeNlInfectieradarData, parseSemicolonCsv } from './nl_infectieradar';
import type { TimeseriesData, Datapoint } from '../utils';

describe('parseSemicolonCsv Tests', () => {
    test('parses semicolon-separated CSV correctly', () => {
        const csv = `WEEK;SAMPLES_N;PATHOGEN;PERC;WEEK_LABEL
2022-09-26;57;Adenovirus;0,00;26 sep t/m 2 okt '22
2022-09-26;57;Influenza A;3,51;26 sep t/m 2 okt '22`;

        const result = parseSemicolonCsv(csv);
        expect(result.length).toBe(2);
        expect(result[0]["WEEK"]).toBe("2022-09-26");
        expect(result[0]["SAMPLES_N"]).toBe("57");
        expect(result[0]["PATHOGEN"]).toBe("Adenovirus");
        expect(result[0]["PERC"]).toBe("0,00");
        expect(result[0]["WEEK_LABEL"]).toBe("26 sep t/m 2 okt '22");
        expect(result[1]["PATHOGEN"]).toBe("Influenza A");
        expect(result[1]["PERC"]).toBe("3,51");
    });

    test('handles empty input', () => {
        const csv = `WEEK;SAMPLES_N;PATHOGEN;PERC;WEEK_LABEL`;
        const result = parseSemicolonCsv(csv);
        expect(result.length).toBe(0);
    });
});

describe('computeNlInfectieradarData Tests', () => {
    test('processes NL pathogen data correctly', () => {
        const input = [
            { WEEK: '2023-01-02', SAMPLES_N: '100', PATHOGEN: 'SARS-CoV-2', PERC: '10,00', WEEK_LABEL: '2 jan t/m 8 jan \'23' },
            { WEEK: '2023-01-09', SAMPLES_N: '120', PATHOGEN: 'SARS-CoV-2', PERC: '5,00', WEEK_LABEL: '9 jan t/m 15 jan \'23' },
            { WEEK: '2023-01-02', SAMPLES_N: '100', PATHOGEN: 'RSV', PERC: '3,50', WEEK_LABEL: '2 jan t/m 8 jan \'23' },
        ];

        const result: TimeseriesData = computeNlInfectieradarData(input);

        expect(result.dates).toEqual(['2023-01-02', '2023-01-09']);

        // Check SARS-CoV-2 series
        const covid = result.series.find(s => s.name === 'SARS-CoV-2 Positivity');
        expect(covid).toBeDefined();
        expect(covid?.type).toBe('raw');
        expect(covid?.frequencyInDays).toBe(7);
        expect((covid?.values[0] as Datapoint).tests).toBe(100);
        expect((covid?.values[0] as Datapoint).positive).toBe(10); // 10% of 100
        expect((covid?.values[1] as Datapoint).tests).toBe(120);
        expect((covid?.values[1] as Datapoint).positive).toBe(6); // 5% of 120

        // Check RSV series
        const rsv = result.series.find(s => s.name === 'RSV Positivity');
        expect(rsv).toBeDefined();
        expect((rsv?.values[0] as Datapoint).tests).toBe(100);
        expect((rsv?.values[0] as Datapoint).positive).toBe(4); // 3.5% of 100 = 3.5, rounded to 4
    });

    test('aggregates Influenza subtypes', () => {
        const input = [
            { WEEK: '2023-01-02', SAMPLES_N: '100', PATHOGEN: 'Influenza A', PERC: '5,00', WEEK_LABEL: '' },
            { WEEK: '2023-01-02', SAMPLES_N: '100', PATHOGEN: 'Influenza B', PERC: '2,00', WEEK_LABEL: '' },
        ];

        const result: TimeseriesData = computeNlInfectieradarData(input);

        // Should have a single "Influenza" series (not A and B separately)
        const influenza = result.series.find(s => s.name === 'Influenza Positivity');
        expect(influenza).toBeDefined();

        // Aggregated: 100 + 100 = 200 tests, 5 + 2 = 7 positive
        expect((influenza?.values[0] as Datapoint).tests).toBe(200);
        expect((influenza?.values[0] as Datapoint).positive).toBe(7);

        // Should NOT have separate Influenza A or B series
        expect(result.series.find(s => s.name === 'Influenza A Positivity')).toBeUndefined();
        expect(result.series.find(s => s.name === 'Influenza B Positivity')).toBeUndefined();
    });

    test('handles comma decimal separator in PERC', () => {
        const input = [
            { WEEK: '2023-01-02', SAMPLES_N: '200', PATHOGEN: 'Adenovirus', PERC: '3,51', WEEK_LABEL: '' },
        ];

        const result: TimeseriesData = computeNlInfectieradarData(input);

        const adeno = result.series.find(s => s.name === 'Adenovirus Positivity');
        expect(adeno).toBeDefined();
        expect((adeno?.values[0] as Datapoint).tests).toBe(200);
        // 3.51% of 200 = 7.02, rounded to 7
        expect((adeno?.values[0] as Datapoint).positive).toBe(7);
    });

    test('handles zero percentage correctly', () => {
        const input = [
            { WEEK: '2023-01-02', SAMPLES_N: '100', PATHOGEN: 'SARS-CoV-2', PERC: '0,00', WEEK_LABEL: '' },
        ];

        const result: TimeseriesData = computeNlInfectieradarData(input);

        const covid = result.series.find(s => s.name === 'SARS-CoV-2 Positivity');
        expect(covid).toBeDefined();
        expect((covid?.values[0] as Datapoint).positive).toBe(0);
        expect((covid?.values[0] as Datapoint).tests).toBe(100);
    });

    test('handles empty input', () => {
        const input: Record<string, string>[] = [];
        const result: TimeseriesData = computeNlInfectieradarData(input);

        expect(result.dates).toEqual([]);
        expect(result.series).toEqual([]);
    });

    test('handles missing dates in some pathogens', () => {
        const input = [
            { WEEK: '2023-01-02', SAMPLES_N: '100', PATHOGEN: 'SARS-CoV-2', PERC: '10,00', WEEK_LABEL: '' },
            { WEEK: '2023-01-09', SAMPLES_N: '100', PATHOGEN: 'SARS-CoV-2', PERC: '8,00', WEEK_LABEL: '' },
            { WEEK: '2023-01-02', SAMPLES_N: '100', PATHOGEN: 'RSV', PERC: '5,00', WEEK_LABEL: '' },
            // RSV has no data for 2023-01-09
        ];

        const result: TimeseriesData = computeNlInfectieradarData(input);

        const rsv = result.series.find(s => s.name === 'RSV Positivity');
        expect(rsv).toBeDefined();
        // First date has data
        expect((rsv?.values[0] as Datapoint).tests).toBe(100);
        expect((rsv?.values[0] as Datapoint).positive).toBe(5);
        // Second date has no data (defaults to 0)
        expect((rsv?.values[1] as Datapoint).tests).toBe(0);
        expect((rsv?.values[1] as Datapoint).positive).toBe(0);
    });
});
