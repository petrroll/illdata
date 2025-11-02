import { computeDeWastewaterData } from './de_wastewater_amelag';
import type { TimeseriesData } from '../utils';

describe('computeDeWastewaterData Tests', () => {
    test('processes Germany wastewater data correctly', () => {
        const input = [
            { datum: '2023-11-29', n: '28', anteil_bev: '0.03130410332194567', viruslast: '1187.59', viruslast_normalisiert: '1459.015070385136', vorhersage: '1141.5915814875107', obere_schranke: '1595.633559673138', untere_schranke: '816.7485141075371', typ: 'Influenza A' },
            { datum: '2023-12-06', n: '42', anteil_bev: '0.06614353242982404', viruslast: '1262.89', viruslast_normalisiert: '1591.6921304455302', vorhersage: '1443.519294902092', obere_schranke: '1963.0076943073625', untere_schranke: '1061.507787665536', typ: 'Influenza A' },
            { datum: '2023-11-29', n: '15', anteil_bev: '0.01234', viruslast: '500.0', viruslast_normalisiert: '600.0', vorhersage: '550.0', obere_schranke: '700.0', untere_schranke: '400.0', typ: 'SARS-CoV-2' },
        ];

        const result: TimeseriesData = computeDeWastewaterData(input);

        expect(result.dates).toEqual(['2023-11-29', '2023-12-06']);
        expect(result.series.length).toBeGreaterThan(0);
        
        // Check that Influenza A series exists
        const influenzaA = result.series.find(s => s.name === 'Influenza A Wastewater');
        expect(influenzaA).toBeDefined();
        expect(influenzaA?.type).toBe('raw');
        expect(influenzaA?.frequencyInDays).toBe(7);
        
        // Check that SARS-CoV-2 series exists
        const covid = result.series.find(s => s.name === 'SARS-CoV-2 Wastewater');
        expect(covid).toBeDefined();
        
        // Check data values
        expect(influenzaA?.values[0].positive).toBeCloseTo(1459.015070385136, 5);
        expect(influenzaA?.values[0].tests).toBe(1);
        expect(influenzaA?.values[1].positive).toBeCloseTo(1591.6921304455302, 5);
        
        expect(covid?.values[0].positive).toBeCloseTo(600.0, 5);
        expect(covid?.values[0].tests).toBe(1);
    });

    test('handles missing data correctly', () => {
        const input = [
            { datum: '2023-11-29', n: '28', anteil_bev: '0.03130410332194567', viruslast: '1187.59', viruslast_normalisiert: '1459.015070385136', vorhersage: '1141.5915814875107', obere_schranke: '1595.633559673138', untere_schranke: '816.7485141075371', typ: 'Influenza A' },
            { datum: '2023-12-13', n: '30', anteil_bev: '0.04', viruslast: '2000.0', viruslast_normalisiert: '2500.0', vorhersage: '2300.0', obere_schranke: '2800.0', untere_schranke: '2000.0', typ: 'Influenza A' },
        ];

        const result: TimeseriesData = computeDeWastewaterData(input);

        expect(result.dates).toEqual(['2023-11-29', '2023-12-13']);
        const influenzaA = result.series.find(s => s.name === 'Influenza A Wastewater');
        expect(influenzaA).toBeDefined();
        
        // First date has data
        expect(influenzaA?.values[0].positive).toBeCloseTo(1459.015070385136, 5);
        expect(influenzaA?.values[0].tests).toBe(1);
        
        // Second date has data
        expect(influenzaA?.values[1].positive).toBeCloseTo(2500.0, 5);
        expect(influenzaA?.values[1].tests).toBe(1);
    });

    test('normalizes virus names correctly', () => {
        const input = [
            { datum: '2023-11-29', n: '28', anteil_bev: '0.03', viruslast: '1187.59', viruslast_normalisiert: '1459.0', vorhersage: '1141.5', obere_schranke: '1595.6', untere_schranke: '816.7', typ: 'RSV A' },
            { datum: '2023-12-06', n: '28', anteil_bev: '0.03', viruslast: '1187.59', viruslast_normalisiert: '1600.0', vorhersage: '1141.5', obere_schranke: '1595.6', untere_schranke: '816.7', typ: 'RSV A/B' },
        ];

        const result: TimeseriesData = computeDeWastewaterData(input);

        // Check that RSV variants are present - RSV A/B is normalized to RSV A+B
        const rsvA = result.series.find(s => s.name === 'RSV A Wastewater');
        const rsvAB = result.series.find(s => s.name === 'RSV A+B Wastewater');
        
        expect(rsvA).toBeDefined();
        expect(rsvAB).toBeDefined();
        
        // RSV A should have data on first date only
        expect(rsvA?.values[0].positive).toBeCloseTo(1459.0, 5);
        expect(rsvA?.values[0].tests).toBe(1);
        expect(rsvA?.values[1].tests).toBeNaN();
        
        // RSV A+B should have data on second date only
        expect(rsvAB?.values[0].tests).toBeNaN();
        expect(rsvAB?.values[1].positive).toBeCloseTo(1600.0, 5);
        expect(rsvAB?.values[1].tests).toBe(1);
    });

    test('handles empty input', () => {
        const input: Record<string, string>[] = [];
        const result: TimeseriesData = computeDeWastewaterData(input);

        expect(result.dates).toEqual([]);
        expect(result.series).toEqual([]);
    });
});
