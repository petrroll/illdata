import { computeDeAreData } from './de_are';
import type { TimeseriesData } from '../utils';

describe('computeDeAreData Tests', () => {
    test('processes nationwide ARE consultation incidence by age group', () => {
        const input = [
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Bundesland: 'Bundesweit', Bundesland_ID: '0', Altersgruppe: '00+', ARE_Konsultationsinzidenz: '970' },
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Bundesland: 'Bundesweit', Bundesland_ID: '0', Altersgruppe: '0-4', ARE_Konsultationsinzidenz: '3882' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Bundesland: 'Bundesweit', Bundesland_ID: '0', Altersgruppe: '00+', ARE_Konsultationsinzidenz: '1115' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Bundesland: 'Bundesweit', Bundesland_ID: '0', Altersgruppe: '0-4', ARE_Konsultationsinzidenz: '4030' },
        ];

        const result: TimeseriesData = computeDeAreData(input);

        expect(result.dates).toEqual(['2025-12-29', '2026-01-05']);
        expect(result.series.map(s => s.name)).toEqual([
            'ARE Consultations (00+)',
            'ARE Consultations (0-4)'
        ]);

        const total = result.series.find(s => s.name === 'ARE Consultations (00+)');
        expect(total).toBeDefined();
        expect(total?.type).toBe('raw');
        expect(total?.frequencyInDays).toBe(7);
        expect(total?.dataType).toBe('scalar');
        expect((total?.values[0] as any).virusLoad).toBe(970);
        expect((total?.values[1] as any).virusLoad).toBe(1115);
    });

    test('ignores federal-state rows and NA values', () => {
        const input = [
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Bundesland: 'Bundesweit', Bundesland_ID: '0', Altersgruppe: '00+', ARE_Konsultationsinzidenz: '970' },
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Bundesland: 'Bayern', Bundesland_ID: '9', Altersgruppe: '00+', ARE_Konsultationsinzidenz: '1234' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Bundesland: 'Bundesweit', Bundesland_ID: '0', Altersgruppe: '00+', ARE_Konsultationsinzidenz: 'NA' },
        ];

        const result: TimeseriesData = computeDeAreData(input);

        expect(result.dates).toEqual(['2025-12-29']);
        const total = result.series.find(s => s.name === 'ARE Consultations (00+)');
        expect((total?.values[0] as any).virusLoad).toBe(970);
    });

    test('handles missing age groups on some dates', () => {
        const input = [
            { Saison: '2025/26', Kalenderwoche: '2026-W01', Bundesland: 'Bundesweit', Bundesland_ID: '0', Altersgruppe: '00+', ARE_Konsultationsinzidenz: '970' },
            { Saison: '2025/26', Kalenderwoche: '2026-W02', Bundesland: 'Bundesweit', Bundesland_ID: '0', Altersgruppe: '0-4', ARE_Konsultationsinzidenz: '4030' },
        ];

        const result: TimeseriesData = computeDeAreData(input);

        const total = result.series.find(s => s.name === 'ARE Consultations (00+)');
        const youngChildren = result.series.find(s => s.name === 'ARE Consultations (0-4)');
        expect((total?.values[1] as any).virusLoad).toBe(0);
        expect((youngChildren?.values[0] as any).virusLoad).toBe(0);
    });

    test('handles empty input', () => {
        const result: TimeseriesData = computeDeAreData([]);

        expect(result.dates).toEqual([]);
        expect(result.series).toEqual([]);
    });
});
