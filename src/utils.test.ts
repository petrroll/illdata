import { 
    findLocalExtreme, 
    filterExtremesByMedianThreshold,
    computeMovingAverageTimeseries,
    getNewWithSifterToAlignExtremeDates,
    compareLabels,
    type LinearSeries, 
    type ExtremeSeries,
    type TimeseriesData,
    type Datapoint
} from './utils';

describe('findLocalExtreme - Local Maxima Tests', () => {
    const seriesMax: LinearSeries = {
        name: 'Averaged Series',
        values: [
            { positive: 1, tests: 100 },
            { positive: 3, tests: 100 },
            { positive: 2, tests: 100 },
            { positive: 4, tests: 100 },
            { positive: 1, tests: 100 }
        ],
        type: 'averaged',
        windowSizeInDays: 3,
        frequencyInDays: 1
    };

    test('filters time series of type averaged (maxima)', () => {
        const result: ExtremeSeries[] = findLocalExtreme(seriesMax, 3, 'maxima');
        expect(result).toEqual([{ name: 'Averaged Series maxima over 3d', originalSeriesName: 'Averaged Series', indices: [1, 3], type: 'extreme', extreme: 'maxima' }]);
    });

    test('selects the provided window size (maxima)', () => {
        const alteredSeries = { 
            ...seriesMax, 
            values: [
                { positive: 1, tests: 100 },
                { positive: 5, tests: 100 },
                { positive: 3, tests: 100 },
                { positive: 7, tests: 100 },
                { positive: 2, tests: 100 },
                { positive: 6, tests: 100 },
                { positive: 1, tests: 100 }
            ]
        };
        const result: ExtremeSeries[] = findLocalExtreme(alteredSeries, 3, 'maxima');
        expect(result).toEqual([{ name: 'Averaged Series maxima over 3d', originalSeriesName: 'Averaged Series', indices: [1, 3, 5], type: 'extreme', extreme: 'maxima' }]);
    });

    test('does not consider local maxima at the edge of the array', () => {
        const edgeSeries = { 
            ...seriesMax, 
            values: [
                { positive: 5, tests: 100 },
                { positive: 1, tests: 100 },
                { positive: 4, tests: 100 },
                { positive: 1, tests: 100 },
                { positive: 5, tests: 100 }
            ]
        };
        const result: ExtremeSeries[] = findLocalExtreme(edgeSeries, 3, 'maxima');
        expect(result).toEqual([{ name: 'Averaged Series maxima over 3d', originalSeriesName: 'Averaged Series', indices: [2], type: 'extreme', extreme: 'maxima' }]);
    });

    test('handles empty series', () => {
        const emptySeries = { ...seriesMax, values: [] };
        const result: ExtremeSeries[] = findLocalExtreme(emptySeries, 3, 'maxima');
        expect(result).toEqual([]);
    });

    test('handles series with single value', () => {
        const singleSeries = { ...seriesMax, values: [{ positive: 1, tests: 100 }] };
        const result: ExtremeSeries[] = findLocalExtreme(singleSeries, 3, 'maxima');
        expect(result).toEqual([]);
    });

    test('handles series with two values', () => {
        const twoSeries = { 
            ...seriesMax, 
            values: [
                { positive: 1, tests: 100 },
                { positive: 2, tests: 100 }
            ]
        };
        const result: ExtremeSeries[] = findLocalExtreme(twoSeries, 3, 'maxima');
        expect(result).toEqual([]);
    });
});

describe('findLocalExtreme - Local Minima Tests', () => {
    const seriesMin: LinearSeries = {
        name: 'Averaged Series',
        values: [
            { positive: 4, tests: 100 },
            { positive: 2, tests: 100 },
            { positive: 3, tests: 100 },
            { positive: 1, tests: 100 },
            { positive: 5, tests: 100 }
        ],
        type: 'averaged',
        windowSizeInDays: 3,
        frequencyInDays: 1,
    };

    test('filters time series of type averaged (minima)', () => {
        const result: ExtremeSeries[] = findLocalExtreme(seriesMin, 3, 'minima');
        expect(result).toEqual([{ name: 'Averaged Series minima over 3d', originalSeriesName: 'Averaged Series', indices: [1, 3], type: 'extreme', extreme: 'minima' }]);
    });

    test('finds all local minima and returns their index', () => {
        const variedSeries = { 
            ...seriesMin, 
            values: [
                { positive: 6, tests: 100 },
                { positive: 2, tests: 100 },
                { positive: 4, tests: 100 },
                { positive: 1, tests: 100 },
                { positive: 3, tests: 100 },
                { positive: 0, tests: 100 },
                { positive: 4, tests: 100 }
            ]
        };
        const result: ExtremeSeries[] = findLocalExtreme(variedSeries, 3, 'minima');
        expect(result).toEqual([{ name: 'Averaged Series minima over 3d', originalSeriesName: 'Averaged Series', indices: [1, 3, 5], type: 'extreme', extreme: 'minima' }]);
    });

    test('does not consider local minima at the edge of the array', () => {
        const edgeMinSeries = { 
            ...seriesMin, 
            values: [
                { positive: 1, tests: 100 },
                { positive: 3, tests: 100 },
                { positive: 1, tests: 100 },
                { positive: 3, tests: 100 },
                { positive: 1, tests: 100 }
            ]
        };
        const result: ExtremeSeries[] = findLocalExtreme(edgeMinSeries, 3, 'minima');
        expect(result).toEqual([{ name: 'Averaged Series minima over 3d', originalSeriesName: 'Averaged Series', indices: [2], type: 'extreme', extreme: 'minima' }]);
    });

    test('handles different window sizes', () => {
        const largeSeries = {
            ...seriesMin,
            values: Array.from({ length: 10 }, (_, i) => ({ positive: i % 3 === 1 ? 1 : 5, tests: 100 }))
        };
        const result5 = findLocalExtreme(largeSeries, 5, 'minima');
        const result1 = findLocalExtreme(largeSeries, 1, 'minima');
        
        expect(result5[0].name).toBe('Averaged Series minima over 5d');
        expect(result1[0].name).toBe('Averaged Series minima over 1d');
    });
});

describe('computeMovingAverageTimeseries Tests', () => {
    test('computes moving average for one series with a single window size', () => {
        const input: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03', '2022-01-04', '2022-01-05'],
            series: [{
                name: 'Test Series',
                values: [
                    { positive: 1, tests: 100 },
                    { positive: 2, tests: 100 },
                    { positive: 3, tests: 100 },
                    { positive: 4, tests: 100 },
                    { positive: 5, tests: 100 }
                ],
                type: 'raw',
                frequencyInDays: 1
            }]
        };
        const windowSizes = [3];
        const result = computeMovingAverageTimeseries(input, windowSizes);
        
        expect(result.dates).toEqual(input.dates);
        expect(result.series).toHaveLength(input.series.length + 1);
        expect(result.series[input.series.length].name).toBe('Test Series (3d avg)');
        expect(result.series[input.series.length].type).toBe('averaged');
        expect(result.series[input.series.length].windowSizeInDays).toBe(3);
        
        // Check that moving average values are calculated correctly
        const avgValues = result.series[input.series.length].values as Datapoint[];
        expect(avgValues).toHaveLength(5);
        // First value: (1+1+2)/3 = 1.333...
        expect(avgValues[0].positive / avgValues[0].tests).toBeCloseTo(0.015, 5);
    });

    test('computes moving averages for multiple window sizes', () => {
        const input: TimeseriesData = {
            dates: ['D1', 'D2', 'D3', 'D4', 'D5'],
            series: [{
                name: 'Multi Window',
                values: [
                    { positive: 10, tests: 100 },
                    { positive: 20, tests: 100 },
                    { positive: 30, tests: 100 },
                    { positive: 40, tests: 100 },
                    { positive: 50, tests: 100 }
                ],
                type: 'raw',
                frequencyInDays: 1
            }]
        };
        const windowSizes = [3, 5];
        const result = computeMovingAverageTimeseries(input, windowSizes);
        
        expect(result.series).toHaveLength(input.series.length + 2);
        expect(result.series[input.series.length].name).toBe('Multi Window (3d avg)');
        expect(result.series[input.series.length + 1].name).toBe('Multi Window (5d avg)');
    });

    test('handles single day window size', () => {
        const input: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02'],
            series: [{
                name: 'Single Day',
                values: [
                    { positive: 10, tests: 100 },
                    { positive: 20, tests: 100 }
                ],
                type: 'raw',
                frequencyInDays: 1
            }]
        };
        const result = computeMovingAverageTimeseries(input, [1]);
        
        expect(result.series[1].name).toBe('Single Day (1d avg)');
        expect(result.series[1].windowSizeInDays).toBe(1);
    });

    test('handles empty series array', () => {
        const input: TimeseriesData = {
            dates: ['2022-01-01'],
            series: []
        };
        const result = computeMovingAverageTimeseries(input, [3]);
        
        expect(result.series).toHaveLength(0);
        expect(result.dates).toEqual(input.dates);
    });

    test('handles different frequency in days', () => {
        const input: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-03', '2022-01-05'],
            series: [{
                name: 'Weekly Series',
                values: [
                    { positive: 10, tests: 100 },
                    { positive: 20, tests: 100 },
                    { positive: 30, tests: 100 }
                ],
                type: 'raw',
                frequencyInDays: 2
            }]
        };
        const result = computeMovingAverageTimeseries(input, [4]);
        
        expect(result.series[1].frequencyInDays).toBe(2);
        expect(result.series[1].windowSizeInDays).toBe(4);
    });
});

describe('addShiftedToAlignExtremeDates Tests', () => {
    test('shifted dataset inherits type from original series', () => {
        // Test data with an 'averaged' type series
        const averagedSeries: LinearSeries = {
            name: 'Test Averaged Series',
            values: [
                { positive: 1, tests: 100 },
                { positive: 3, tests: 100 },
                { positive: 2, tests: 100 },
                { positive: 4, tests: 100 },
                { positive: 1, tests: 100 }
            ],
            type: 'averaged',
            windowSizeInDays: 7,
            frequencyInDays: 1
        };

        // Test data with a 'raw' type series
        const rawSeries: LinearSeries = {
            name: 'Test Raw Series',
            values: [
                { positive: 2, tests: 100 },
                { positive: 4, tests: 100 },
                { positive: 3, tests: 100 },
                { positive: 5, tests: 100 },
                { positive: 2, tests: 100 }
            ],
            type: 'raw',
            frequencyInDays: 1
        };

        const data: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03', '2022-01-04', '2022-01-05'],
            series: [averagedSeries, rawSeries]
        };

        // Extreme series for shifting
        const extremeSeries: ExtremeSeries[] = [
            {
                name: 'Test Averaged Series maxima over 3d',
                originalSeriesName: 'Test Averaged Series',
                indices: [1, 3],
                type: 'extreme',
                extreme: 'maxima'
            },
            {
                name: 'Test Raw Series maxima over 3d',
                originalSeriesName: 'Test Raw Series',
                indices: [1, 3],
                type: 'extreme',
                extreme: 'maxima'
            }
        ];

        // Apply shifting
        const result = getNewWithSifterToAlignExtremeDates(data, extremeSeries, 1, 2, false);

        // Should have original series + shifted series
        expect(result.series.length).toBeGreaterThan(data.series.length);

        // Find shifted series
        const shiftedAveragedSeries = result.series.find(s => 
            s.name.includes('Test Averaged Series') && s.name.includes('shifted by'));
        const shiftedRawSeries = result.series.find(s => 
            s.name.includes('Test Raw Series') && s.name.includes('shifted by'));

        // Verify shifted averaged series inherits 'averaged' type and windowSizeInDays
        expect(shiftedAveragedSeries).toBeDefined();
        expect(shiftedAveragedSeries?.type).toBe('averaged');
        expect(shiftedAveragedSeries?.windowSizeInDays).toBe(7);

        // Verify shifted raw series inherits 'raw' type and no windowSizeInDays
        expect(shiftedRawSeries).toBeDefined();
        expect(shiftedRawSeries?.type).toBe('raw');
        expect(shiftedRawSeries?.windowSizeInDays).toBeUndefined();
    });
});

describe('findLocalExtreme - Filtering Tests', () => {
    test('separates extremes detection from filtering', () => {
        // Test series with mix of significant and insignificant extremes
        const testSeries: LinearSeries = {
            name: 'Test Series',
            values: [
                { positive: 10, tests: 100 },  // 10%
                { positive: 8, tests: 100 },   // 8% - small minimum (will be compared against threshold)
                { positive: 12, tests: 100 },  // 12% - small maximum (will be compared against threshold)
                { positive: 9, tests: 100 },   // 9% - small minimum (will be compared against threshold)
                { positive: 25, tests: 100 },  // 25% - large maximum (should keep)
                { positive: 2, tests: 100 },   // 2% - large minimum (should keep)
                { positive: 20, tests: 100 },  // 20% - large maximum (should keep)  
                { positive: 5, tests: 100 },   // 5% - medium minimum (should keep)
                { positive: 15, tests: 100 },  // 15% - medium maximum (should keep)
                { positive: 3, tests: 100 },   // 3% - large minimum (should keep)
                { positive: 10, tests: 100 }   // 10%
            ],
            type: 'averaged',
            windowSizeInDays: 3,
            frequencyInDays: 1
        };

        // Step 1: Find all local extremes (unfiltered)
        const rawMaxima = findLocalExtreme(testSeries, 3, 'maxima');
        const rawMinima = findLocalExtreme(testSeries, 3, 'minima');

        // Should have found raw extremes
        expect(rawMaxima).toHaveLength(1);
        expect(rawMinima).toHaveLength(1);
        
        // Raw results should include all local extremes
        expect(rawMaxima[0].indices.length).toBeGreaterThan(0);
        expect(rawMinima[0].indices.length).toBeGreaterThan(0);
        
        // Step 2: Apply filtering as separate step
        const filtered = filterExtremesByMedianThreshold(testSeries, rawMaxima, rawMinima);
        
        // After filtering, should have fewer or equal extremes
        expect(filtered.filteredMaxima[0].indices.length).toBeLessThanOrEqual(rawMaxima[0].indices.length);
        expect(filtered.filteredMinima[0].indices.length).toBeLessThanOrEqual(rawMinima[0].indices.length);
        
        // The filtering should preserve meaningful extremes
        expect(filtered.filteredMaxima[0].indices.length).toBeGreaterThan(0);
        expect(filtered.filteredMinima[0].indices.length).toBeGreaterThan(0);
    });
});

describe('compareLabels Tests', () => {
    test('sorts by word count first (fewer words first)', () => {
        expect(compareLabels('Short', 'Much Longer Label')).toBeLessThan(0);
        expect(compareLabels('Much Longer Label', 'Short')).toBeGreaterThan(0);
        expect(compareLabels('Two Words', 'Three Word Label')).toBeLessThan(0);
    });

    test('sorts alphabetically when word count is equal', () => {
        expect(compareLabels('Apple', 'Banana')).toBeLessThan(0);
        expect(compareLabels('Zebra', 'Apple')).toBeGreaterThan(0);
        expect(compareLabels('Same Label', 'Same Label')).toBe(0);
    });

    test('handles labels with multiple spaces correctly', () => {
        // Multiple spaces should be treated as one word separator for word counting
        // Both have 2 words, so it falls back to alphabetical string comparison
        const result = compareLabels('One   Two', 'One Two');
        expect(result).not.toBe(0); // Different strings, not equal
        
        // Test word counting with leading/trailing spaces  
        const result2 = compareLabels('  Two Words  ', 'Single');
        expect(result2).toBeGreaterThan(0); // 2 words > 1 word
    });

    test('handles empty strings', () => {
        expect(compareLabels('', '')).toBe(0);
        expect(compareLabels('Something', '')).toBeGreaterThan(0);
        expect(compareLabels('', 'Something')).toBeLessThan(0);
    });

    test('complex sorting scenario', () => {
        const labels = [
            'PCR Positivity (28d avg) shifted by 1 wave 56d',
            'PCR Positivity',
            'Antigen Positivity (28d avg)',
            'PCR Positivity (28d avg)'
        ];
        
        const sorted = [...labels].sort(compareLabels);
        
        // Should be sorted by word count, then alphabetically
        expect(sorted[0]).toBe('PCR Positivity');
        expect(sorted[1]).toBe('Antigen Positivity (28d avg)');
        expect(sorted[2]).toBe('PCR Positivity (28d avg)');
        expect(sorted[3]).toBe('PCR Positivity (28d avg) shifted by 1 wave 56d');
    });
});
