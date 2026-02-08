import { describe, test, expect } from 'bun:test';
import { 
    isNonAveragedSeries, 
    getVisibilityDefault,
    isShiftedSeries,
    isTestNumberSeries,
    isMinMaxSeries,
    stripShiftAndExtremeSuffixes,
    shouldIncludeShiftedSeries
} from './series-utils';

describe('isNonAveragedSeries Tests', () => {
    test('identifies raw series correctly', () => {
        expect(isNonAveragedSeries({ type: 'raw' })).toBe(true);
    });

    test('identifies averaged series correctly', () => {
        expect(isNonAveragedSeries({ type: 'averaged' })).toBe(false);
    });
});

describe('getVisibilityDefault with showNonAveragedSeries Tests', () => {
    test('hides raw series when showNonAveragedSeries is false', () => {
        const result = getVisibilityDefault(
            'PCR Positivity',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            false, // showNonAveragedSeries
            'raw'  // seriesType
        );
        expect(result).toBe(false);
    });

    test('shows raw series when showNonAveragedSeries is true', () => {
        const result = getVisibilityDefault(
            'PCR Positivity',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            true,  // showNonAveragedSeries
            'raw'  // seriesType
        );
        expect(result).toBe(true);
    });

    test('always shows averaged series regardless of showNonAveragedSeries', () => {
        const resultWhenFalse = getVisibilityDefault(
            'PCR Positivity (28d avg)',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            false, // showNonAveragedSeries
            'averaged'  // seriesType
        );
        expect(resultWhenFalse).toBe(true);

        const resultWhenTrue = getVisibilityDefault(
            'PCR Positivity (28d avg)',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            true,  // showNonAveragedSeries
            'averaged'  // seriesType
        );
        expect(resultWhenTrue).toBe(true);
    });

    test('test number series are not affected by showNonAveragedSeries', () => {
        // Test numbers should follow their own toggle
        const result = getVisibilityDefault(
            'PCR Positivity - tests',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            false, // showNonAveragedSeries (should not affect test numbers)
            'raw'  // seriesType
        );
        expect(result).toBe(true); // Should be visible because showTestNumbers is true
    });

    test('test number series are hidden when showTestNumbers is false', () => {
        const result = getVisibilityDefault(
            'PCR Positivity - tests',
            true,  // showShifted
            false, // showTestNumbers
            false, // showShiftedTestNumbers
            false, // showNonAveragedSeries
            'raw'  // seriesType
        );
        expect(result).toBe(false);
    });

    test('shifted series are hidden by default regardless of showNonAveragedSeries', () => {
        const result = getVisibilityDefault(
            'PCR Positivity shifted by 1 wave -347d',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            true,  // showNonAveragedSeries
            'raw'  // seriesType
        );
        expect(result).toBe(false); // Shifted series are always hidden by default
    });

    test('min/max series are hidden by default regardless of showNonAveragedSeries', () => {
        const result = getVisibilityDefault(
            'PCR Positivity (28d avg) - Maxima',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            true,  // showNonAveragedSeries
            'averaged'  // seriesType
        );
        expect(result).toBe(false); // Min/Max series are always hidden by default
    });

    test('works without seriesType parameter (backward compatibility)', () => {
        // When seriesType is not provided, showNonAveragedSeries should not affect visibility
        const result = getVisibilityDefault(
            'PCR Positivity',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            false  // showNonAveragedSeries
            // seriesType omitted
        );
        expect(result).toBe(true); // Should be visible (backward compatible behavior)
    });

    test('showNonAveragedSeries defaults to false', () => {
        // Test that when showNonAveragedSeries is not provided, it defaults to false
        const result = getVisibilityDefault(
            'PCR Positivity',
            true,  // showShifted
            true,  // showTestNumbers
            false  // showShiftedTestNumbers
            // showNonAveragedSeries omitted (defaults to false)
            // seriesType omitted
        );
        expect(result).toBe(true); // Without type, it should be visible
    });

    test('priority: shifted series override takes precedence', () => {
        // Even if showNonAveragedSeries is true, shifted series should be hidden
        const result = getVisibilityDefault(
            'PCR Positivity (28d avg) shifted by -300d',
            true,  // showShifted
            true,  // showTestNumbers
            false, // showShiftedTestNumbers
            true,  // showNonAveragedSeries
            'averaged'  // seriesType
        );
        expect(result).toBe(false); // Shifted series are always hidden by default
    });

    test('priority: test numbers toggle takes precedence over showNonAveragedSeries', () => {
        // Test numbers should follow showTestNumbers, not showNonAveragedSeries
        const resultHidden = getVisibilityDefault(
            'PCR Positivity - tests',
            true,  // showShifted
            false, // showTestNumbers - this should take precedence
            false, // showShiftedTestNumbers
            true,  // showNonAveragedSeries - should not matter for test numbers
            'raw'  // seriesType
        );
        expect(resultHidden).toBe(false);
    });
});

describe('stripShiftAndExtremeSuffixes Tests', () => {
    test('removes shift and extreme suffixes', () => {
        expect(stripShiftAndExtremeSuffixes('PCR Positivity (28d avg) shifted by 1 wave -347d')).toBe('PCR Positivity (28d avg)');
        expect(stripShiftAndExtremeSuffixes('PCR Positivity minima over 84d')).toBe('PCR Positivity');
        expect(stripShiftAndExtremeSuffixes('RSV Wastewater shifted by 1 wave NaNd')).toBe('RSV Wastewater');
    });
});

describe('shouldIncludeShiftedSeries Tests', () => {
    test('respects showShifted and showShiftedTestNumbers settings', () => {
        const shiftedLabel = 'PCR Positivity shifted by -300d';
        const regularLabel = 'PCR Positivity';
        
        expect(shouldIncludeShiftedSeries(shiftedLabel, false)).toBe(false);
        expect(shouldIncludeShiftedSeries(shiftedLabel, true, false)).toBe(false);
        expect(shouldIncludeShiftedSeries(shiftedLabel, true, true)).toBe(true);
        expect(shouldIncludeShiftedSeries(regularLabel, false)).toBe(true);
    });
});
