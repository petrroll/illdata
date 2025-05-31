import { 
    findLocalExtreme, 
    computeMovingAverageTimeseries,
    addShiftedToAlignExtremeDates,
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
        expect(result).toEqual([{ name: 'Averaged Series maxima over 3d', originalSeriesName: 'Averaged Series', indices: [1, 3] }]);
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
        expect(result).toEqual([{ name: 'Averaged Series maxima over 3d', originalSeriesName: 'Averaged Series', indices: [1, 3, 5] }]);
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
        expect(result).toEqual([{ name: 'Averaged Series maxima over 3d', originalSeriesName: 'Averaged Series', indices: [2] }]);
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
        expect(result).toEqual([{ name: 'Averaged Series minima over 3d', originalSeriesName: 'Averaged Series', indices: [1, 3] }]);
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
        expect(result).toEqual([{ name: 'Averaged Series minima over 3d', originalSeriesName: 'Averaged Series', indices: [1, 3, 5] }]);
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
        expect(result).toEqual([{ name: 'Averaged Series minima over 3d', originalSeriesName: 'Averaged Series', indices: [2] }]);
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
                indices: [1, 3]
            },
            {
                name: 'Test Raw Series maxima over 3d',
                originalSeriesName: 'Test Raw Series',
                indices: [1, 3]
            }
        ];

        // Apply shifting
        const result = addShiftedToAlignExtremeDates(data, extremeSeries, 1, 2, false);

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
