import { describe, test, expect } from 'bun:test';
import { assembleChartVariants, stripRatioLabel, variantKey, seriesSmoothing } from './chart-variants';
import { DATA_VIEWS, SMOOTHING_WINDOWS } from './settings';
import { computeMovingAverageTimeseries, computeRatioTimeseries, getNewWithCustomShift, getExtremeMatchSeriesName, getColorBaseSeriesName, type TimeseriesData, type ScalarSeries, type PositivitySeries } from './utils';

const source: TimeseriesData = {
    dates: Array.from({ length: 140 }, (_, index) => new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10)),
    series: [{
        name: 'PCR Positivity', type: 'raw', frequencyInDays: 1, dataType: 'positivity',
        values: Array.from({ length: 140 }, (_, index) => ({
            positive: index >= 84 ? 0 : index === 56 ? 100 : 10,
            tests: index % 3 === 0 ? 200 : 100
        }))
    }]
};

describe('built-in chart combinations', () => {
    test('every selection subset produces exactly its selected data/smoothing pairs', () => {
        for (let dataMask = 0; dataMask < 8; dataMask++) {
            for (let smoothingMask = 0; smoothingMask < 8; smoothingMask++) {
                const views = DATA_VIEWS.filter((_, i) => dataMask & (1 << i));
                const windows = SMOOTHING_WINDOWS.filter((_, i) => smoothingMask & (1 << i));
                const result = assembleChartVariants(source, views, windows);
                expect(result.dates).toEqual(source.dates);
                expect(result.series.map(series => variantKey(series.name)).sort()).toEqual(
                    views.flatMap(view => windows.map(window => `${view}:${window}`)).sort()
                );
                expect(result.series.every(series => windows.includes(seriesSmoothing(series)))).toBe(true);
            }
        }
    });

    test('changing selections does not mutate an earlier result or the source', () => {
        const original = structuredClone(source);
        const first = assembleChartVariants(source, ['raw', 'ratio7'], ['none', '7']);
        const snapshot = structuredClone(first);
        assembleChartVariants(source, ['ratio28'], ['28']);
        expect(first).toEqual(snapshot);
        expect(source).toEqual(original);
    });

    test('produces each pair exactly once, reuses existing raw smoothing, and never mutates source', () => {
        const prepared = computeMovingAverageTimeseries(source, [28]);
        const result = assembleChartVariants(prepared, ['raw', 'ratio7', 'ratio28', 'raw'], ['none', '7', '28', '7']);
        expect(result.series).toHaveLength(9);
        expect(new Set(result.series.map(series => series.name)).size).toBe(9);
        expect(result.series[0]).toBe(source.series[0]);
        expect(result.series.find(series => series.name === 'PCR Positivity (28d avg)')).toBe(prepared.series[1]);
        expect(prepared.series).toHaveLength(2);
        expect(source.series[0].name).toBe('PCR Positivity');
    });

    test('None leaves ratios unsmoothed and both smoothing windows smooth the ratios, not input positivity', () => {
        const result = assembleChartVariants(source, ['ratio28'], ['none', '7', '28']);
        const raw = result.series[0] as ScalarSeries;
        const week = result.series[1] as ScalarSeries;
        const month = result.series[2] as ScalarSeries;
        expect(raw.values).toEqual((computeRatioTimeseries(source, 28).series[0] as ScalarSeries).values);
        expect(week.values[84].virusLoad).toBeCloseTo(raw.values.slice(81, 88).reduce((sum, value) => sum + value.virusLoad, 0) / 7, 12);
        expect(month.values[84].virusLoad).toBeCloseTo(raw.values.slice(71, 99).reduce((sum, value) => sum + value.virusLoad, 0) / 28, 12);
        expect(raw.values[111].virusLoad).toBe(0);
        expect(month.values[138].virusLoad).toBe(0);
        expect(Number.isNaN(month.values[139].virusLoad)).toBe(true);
    });

    test('raw smoothing preserves pooled positives and tests, not a mean of percentages', () => {
        const result = assembleChartVariants(source, ['raw'], ['none', '7']);
        const smoothed = result.series[1] as PositivitySeries;
        const window = (source.series[0] as PositivitySeries).values.slice(53, 60);
        expect(smoothed.values[56]).toEqual({
            positive: window.reduce((sum, point) => sum + point.positive, 0),
            tests: window.reduce((sum, point) => sum + point.tests, 0)
        });
    });

    test('either empty selection produces no variants', () => {
        expect(assembleChartVariants(source, [], ['28']).series).toEqual([]);
        expect(assembleChartVariants(source, ['raw'], []).series).toEqual([]);
    });

    test('ratio labels retain absolute color and extreme identity and shifts translate each pair once', () => {
        const variants = assembleChartVariants(source, ['raw', 'ratio7'], ['none', '7']);
        const shifted = getNewWithCustomShift(variants, -10, true);
        expect(shifted.series).toHaveLength(8);
        const ratio = shifted.series.find(series => series.name === 'PCR Positivity - 7d Ratio shifted by -10d') as ScalarSeries;
        expect(ratio.values[80]).toEqual((variants.series[2] as ScalarSeries).values[70]);
        expect(stripRatioLabel(ratio.name)).toBe('PCR Positivity shifted by -10d');
        expect(getExtremeMatchSeriesName(ratio.name)).toBe('PCR Positivity');
        expect(getColorBaseSeriesName(ratio.name)).toBe('PCR Positivity');
    });
});
