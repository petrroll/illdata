import { computeDeAreData } from './de_are';
import type { TimeseriesData } from '../utils';

describe('computeDeAreData Tests', () => {
    test('processes SARI hospitalization incidence by pathogen with aggregate age first', () => {
        const input = [
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Altersgruppe: '00+', SARI: 'Gesamt', Hospitalisierungsinzidenz: '12.2' },
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Altersgruppe: '00+', SARI: 'COVID-19', Hospitalisierungsinzidenz: '0.1' },
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Altersgruppe: '00+', SARI: 'Influenza', Hospitalisierungsinzidenz: '3.4' },
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Altersgruppe: '00+', SARI: 'RSV', Hospitalisierungsinzidenz: '2.5' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Altersgruppe: '00+', SARI: 'Gesamt', Hospitalisierungsinzidenz: '14.8' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Altersgruppe: '00+', SARI: 'COVID-19', Hospitalisierungsinzidenz: '0.2' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Altersgruppe: '00+', SARI: 'Influenza', Hospitalisierungsinzidenz: '4.1' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Altersgruppe: '00+', SARI: 'RSV', Hospitalisierungsinzidenz: '3.0' },
        ];

        const result: TimeseriesData = computeDeAreData(input);

        expect(result.dates).toEqual(['2025-12-29', '2026-01-05']);
        expect(result.series.map(s => s.name)).toEqual([
            'Overall SARI Hospitalization Incidence',
            'COVID-19 SARI Hospitalization Incidence',
            'Influenza SARI Hospitalization Incidence',
            'RSV SARI Hospitalization Incidence'
        ]);

        const influenza = result.series.find(s => s.name === 'Influenza SARI Hospitalization Incidence');
        expect(influenza).toBeDefined();
        expect(influenza?.type).toBe('raw');
        expect(influenza?.frequencyInDays).toBe(7);
        expect(influenza?.dataType).toBe('scalar');
        expect(influenza?.ageGroup).toBe('00+');
        expect((influenza?.values[0] as any).virusLoad).toBe(3.4);
        expect((influenza?.values[1] as any).virusLoad).toBe(4.1);
    });

    test('keeps age groups as metadata instead of separate legend grouping', () => {
        const input = [
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Altersgruppe: '00+', SARI: 'Gesamt', Hospitalisierungsinzidenz: '12.2' },
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Altersgruppe: '0-4', SARI: 'Gesamt', Hospitalisierungsinzidenz: '38.8' },
        ];

        const result: TimeseriesData = computeDeAreData(input);

        expect(result.series.map(s => s.name)).toEqual([
            'Overall SARI Hospitalization Incidence',
            'Overall SARI Hospitalization Incidence'
        ]);
        expect(result.series.map(s => s.ageGroup)).toEqual(['00+', '0-4']);
    });

    test('ignores invalid week and incidence values', () => {
        const input = [
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Altersgruppe: '00+', SARI: 'Gesamt', Hospitalisierungsinzidenz: '12.2' },
            { Saison: '2025/26', Kalenderwoche: 'bad-week', Altersgruppe: '00+', SARI: 'RSV', Hospitalisierungsinzidenz: '1.2' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Altersgruppe: '00+', SARI: 'Gesamt', Hospitalisierungsinzidenz: 'NA' },
        ];

        const result: TimeseriesData = computeDeAreData(input);

        expect(result.dates).toEqual(['2025-12-29']);
        const total = result.series.find(s => s.name === 'Overall SARI Hospitalization Incidence');
        expect((total?.values[0] as any).virusLoad).toBe(12.2);
    });

    test('handles missing pathogen values on some dates', () => {
        const input = [
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Altersgruppe: '00+', SARI: 'Gesamt', Hospitalisierungsinzidenz: '12.2' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Altersgruppe: '00+', SARI: 'Influenza', Hospitalisierungsinzidenz: '4.1' },
        ];

        const result: TimeseriesData = computeDeAreData(input);

        const total = result.series.find(s => s.name === 'Overall SARI Hospitalization Incidence');
        const influenza = result.series.find(s => s.name === 'Influenza SARI Hospitalization Incidence');
        expect((total?.values[1] as any).virusLoad).toBe(0);
        expect((influenza?.values[0] as any).virusLoad).toBe(0);
    });

    test('handles empty input', () => {
        const result: TimeseriesData = computeDeAreData([]);

        expect(result.dates).toEqual([]);
        expect(result.series).toEqual([]);
    });
});
