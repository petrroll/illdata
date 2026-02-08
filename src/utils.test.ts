import { 
    findLocalExtreme, 
    filterExtremesByMedianThreshold,
    computeMovingAverageTimeseries,
    getNewWithSifterToAlignExtremeDates,
    getNewWithCustomShift,
    compareLabels,
    isScalarSeries,
    type PositivitySeries, 
    type ScalarSeries,
    type ExtremeSeries,
    type TimeseriesData,
    type Datapoint
} from './utils';

describe('isScalarSeries Type Guard Tests', () => {
    test('returns true for scalar series', () => {
        const scalarSeries: ScalarSeries = {
            name: 'Wastewater Series',
            values: [{ virusLoad: 100 }, { virusLoad: 200 }],
            type: 'raw',
            frequencyInDays: 1,
            dataType: 'scalar'
        };
        expect(isScalarSeries(scalarSeries)).toBe(true);
    });

    test('returns false for positivity series', () => {
        const positivitySeries: PositivitySeries = {
            name: 'PCR Positivity',
            values: [{ positive: 10, tests: 100 }, { positive: 20, tests: 100 }],
            type: 'raw',
            frequencyInDays: 1,
            dataType: 'positivity'
        };
        expect(isScalarSeries(positivitySeries)).toBe(false);
    });

    test('works with averaged scalar series', () => {
        const avgScalarSeries: ScalarSeries = {
            name: 'Wastewater (28d avg)',
            values: [{ virusLoad: 150 }],
            type: 'averaged',
            windowSizeInDays: 28,
            frequencyInDays: 1,
            dataType: 'scalar'
        };
        expect(isScalarSeries(avgScalarSeries)).toBe(true);
    });

    test('works with averaged positivity series', () => {
        const avgPositivitySeries: PositivitySeries = {
            name: 'PCR Positivity (28d avg)',
            values: [{ positive: 15, tests: 100 }],
            type: 'averaged',
            windowSizeInDays: 28,
            frequencyInDays: 1,
            dataType: 'positivity'
        };
        expect(isScalarSeries(avgPositivitySeries)).toBe(false);
    });
});

describe('findLocalExtreme - Local Maxima Tests', () => {
    const seriesMax: PositivitySeries = {
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
        frequencyInDays: 1,
        dataType: 'positivity' as const
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
    const seriesMin: PositivitySeries = {
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
        dataType: 'positivity' as const
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
                frequencyInDays: 1,
        dataType: 'positivity' as const
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
                frequencyInDays: 1,
        dataType: 'positivity' as const
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
                frequencyInDays: 1,
        dataType: 'positivity' as const
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
                frequencyInDays: 2,
                dataType: 'positivity' as const
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
        const averagedSeries: PositivitySeries = {
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
            frequencyInDays: 1,
        dataType: 'positivity' as const
        };

        // Test data with a 'raw' type series
        const rawSeries: PositivitySeries = {
            name: 'Test Raw Series',
            values: [
                { positive: 2, tests: 100 },
                { positive: 4, tests: 100 },
                { positive: 3, tests: 100 },
                { positive: 5, tests: 100 },
                { positive: 2, tests: 100 }
            ],
            type: 'raw',
            frequencyInDays: 1,
        dataType: 'positivity' as const
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

    test('shifts raw series when extremes are from averaged series', () => {
        // This test verifies the fix for: "Shift by waves doesn't produce shifted numbers of tests"
        // When extremes are calculated on averaged series (e.g., "PCR Positivity (28d avg)"),
        // the corresponding raw series (e.g., "PCR Positivity") should also be shifted by the same amount
        
        const rawSeries: PositivitySeries = {
            name: 'PCR Positivity',
            values: [
                { positive: 10, tests: 100 },
                { positive: 20, tests: 100 },
                { positive: 30, tests: 100 },
                { positive: 25, tests: 100 },
                { positive: 15, tests: 100 }
            ],
            type: 'raw',
            frequencyInDays: 1,
            dataType: 'positivity' as const
        };

        const averagedSeries: PositivitySeries = {
            name: 'PCR Positivity (28d avg)',
            values: [
                { positive: 15, tests: 100 },
                { positive: 20, tests: 100 },
                { positive: 25, tests: 100 },
                { positive: 20, tests: 100 },
                { positive: 15, tests: 100 }
            ],
            type: 'averaged',
            windowSizeInDays: 28,
            frequencyInDays: 1,
            dataType: 'positivity' as const
        };

        const data: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03', '2022-01-04', '2022-01-05'],
            series: [rawSeries, averagedSeries]
        };

        // Extremes calculated on the AVERAGED series
        const extremeSeries: ExtremeSeries[] = [
            {
                name: 'PCR Positivity (28d avg) maxima over 3d',
                originalSeriesName: 'PCR Positivity (28d avg)',
                indices: [2, 4], // Two maxima
                type: 'extreme',
                extreme: 'maxima'
            }
        ];

        // Apply shifting - this should shift BOTH the averaged series AND the raw series
        const result = getNewWithSifterToAlignExtremeDates(data, extremeSeries, 1, 2, false);

        // Should have: raw, raw shifted, averaged, averaged shifted = 4 series
        expect(result.series.length).toBe(4);

        // Find shifted raw series - the key test!
        const shiftedRawSeries = result.series.find(s => 
            s.name.includes('PCR Positivity') && 
            !s.name.includes('(28d avg)') && 
            s.name.includes('shifted by'));
        
        expect(shiftedRawSeries).toBeDefined();
        expect(shiftedRawSeries?.type).toBe('raw');
        expect(shiftedRawSeries?.shiftedByIndexes).toBe(-2); // Should be shifted by the difference between the two maxima
        expect('dataType' in shiftedRawSeries! && shiftedRawSeries.dataType).toBe('positivity');

        // Find shifted averaged series
        const shiftedAveragedSeries = result.series.find(s => 
            s.name.includes('PCR Positivity (28d avg)') && 
            s.name.includes('shifted by'));
        
        expect(shiftedAveragedSeries).toBeDefined();
        expect(shiftedAveragedSeries?.type).toBe('averaged');
        expect(shiftedAveragedSeries?.shiftedByIndexes).toBe(-2); // Should have the same shift as the raw series
    });
});

describe('findLocalExtreme - Filtering Tests', () => {
    test('separates extremes detection from filtering', () => {
        // Test series with mix of significant and insignificant extremes
        const testSeries: PositivitySeries = {
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
            frequencyInDays: 1,
        dataType: 'positivity' as const
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

describe('getNewWithCustomShift Tests', () => {
    test('applies custom shift to series', () => {
        const testSeries: PositivitySeries = {
            name: 'Test Series',
            values: [
                { positive: 1, tests: 100 },
                { positive: 2, tests: 100 },
                { positive: 3, tests: 100 },
                { positive: 4, tests: 100 },
                { positive: 5, tests: 100 }
            ],
            type: 'raw',
            frequencyInDays: 1,
            dataType: 'positivity'
        };

        const data: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03', '2022-01-04', '2022-01-05'],
            series: [testSeries]
        };

        const result = getNewWithCustomShift(data, 2, false);

        // Should have original series + shifted series
        expect(result.series).toHaveLength(2);

        // Find the shifted series
        const shiftedSeries = result.series.find(s => s.name.includes('shifted by 2d'));
        expect(shiftedSeries).toBeDefined();
        expect(shiftedSeries?.shiftedByIndexes).toBe(2);

        // Check that shifted values are correct (shifted forward by 2)
        // Positive shift means pulling data from future indices
        expect(shiftedSeries?.values[0]).toEqual({ positive: 3, tests: 100 }); // Original index 2
        expect(shiftedSeries?.values[1]).toEqual({ positive: 4, tests: 100 }); // Original index 3
        expect(shiftedSeries?.values[2]).toEqual({ positive: 5, tests: 100 }); // Original index 4
        expect(shiftedSeries?.values[3]).toEqual({ positive: 0, tests: NaN }); // Out of bounds
    });

    test('applies negative custom shift', () => {
        const testSeries: PositivitySeries = {
            name: 'Test Series',
            values: [
                { positive: 10, tests: 100 },
                { positive: 20, tests: 100 },
                { positive: 30, tests: 100 }
            ],
            type: 'raw',
            frequencyInDays: 1,
            dataType: 'positivity'
        };

        const data: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03'],
            series: [testSeries]
        };

        const result = getNewWithCustomShift(data, -1, true);

        // Should have extended dates for future values
        expect(result.dates.length).toBeGreaterThanOrEqual(data.dates.length);

        // Find the shifted series
        const shiftedSeries = result.series.find(s => s.name.includes('shifted by -1d'));
        expect(shiftedSeries).toBeDefined();
        expect(shiftedSeries?.shiftedByIndexes).toBe(-1);

        // Check that values are shifted backward (negative shift pulls from past indices)
        expect(shiftedSeries?.values[0]).toEqual({ positive: 0, tests: NaN }); // Out of bounds (index -1)
        expect(shiftedSeries?.values[1]).toEqual({ positive: 10, tests: 100 }); // Original index 0
        expect(shiftedSeries?.values[2]).toEqual({ positive: 20, tests: 100 }); // Original index 1
    });

    test('applies custom shift to averaged series with windowSizeInDays', () => {
        const averagedSeries: PositivitySeries = {
            name: 'Averaged Series',
            values: [
                { positive: 1, tests: 100 },
                { positive: 2, tests: 100 },
                { positive: 3, tests: 100 }
            ],
            type: 'averaged',
            windowSizeInDays: 7,
            frequencyInDays: 1,
            dataType: 'positivity'
        };

        const data: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03'],
            series: [averagedSeries]
        };

        const result = getNewWithCustomShift(data, 1, false);

        // Find the shifted series
        const shiftedSeries = result.series.find(s => s.name.includes('shifted by 1d'));
        expect(shiftedSeries).toBeDefined();
        expect(shiftedSeries?.type).toBe('averaged');
        expect(shiftedSeries?.windowSizeInDays).toBe(7);
    });
});

describe('Future Data Padding Tests', () => {
    test('properly pads positivity series with correct placeholder objects when includeFutureDates is true', () => {
        const testSeries: PositivitySeries = {
            name: 'Test Series',
            values: [
                { positive: 10, tests: 100 },
                { positive: 20, tests: 100 },
                { positive: 30, tests: 100 }
            ],
            type: 'raw',
            frequencyInDays: 1,
            dataType: 'positivity'
        };

        const extremeSeries: ExtremeSeries[] = [
            {
                name: 'Test Series maxima over 3d',
                originalSeriesName: 'Test Series',
                indices: [1, 2],
                type: 'extreme',
                extreme: 'maxima'
            }
        ];

        const data: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03'],
            series: [testSeries]
        };

        // Apply alignment with includeFutureDates = true
        // This should add future dates and pad base series with proper placeholders
        const result = getNewWithSifterToAlignExtremeDates(data, extremeSeries, 1, 2, true);

        // Find the base (unshifted) series
        const baseSeries = result.series.find(s => !s.name.includes('shifted by'));
        expect(baseSeries).toBeDefined();
        
        // Base series should have more values than original due to padding
        expect(baseSeries!.values.length).toBeGreaterThan(testSeries.values.length);
        
        // Check that padded values are proper Datapoint objects
        const paddedValue = baseSeries!.values[baseSeries!.values.length - 1];
        expect(paddedValue).toHaveProperty('positive');
        expect(paddedValue).toHaveProperty('tests');
        expect((paddedValue as Datapoint).positive).toBe(0);
        expect(isNaN((paddedValue as Datapoint).tests)).toBe(true);
    });

    test('properly pads scalar series with correct placeholder objects when includeFutureDates is true', () => {
        const testSeries: ScalarSeries = {
            name: 'Wastewater Series',
            values: [
                { virusLoad: 100 },
                { virusLoad: 200 },
                { virusLoad: 300 }
            ],
            type: 'raw',
            frequencyInDays: 1,
            dataType: 'scalar'
        };

        const extremeSeries: ExtremeSeries[] = [
            {
                name: 'Wastewater Series maxima over 3d',
                originalSeriesName: 'Wastewater Series',
                indices: [1, 2],
                type: 'extreme',
                extreme: 'maxima'
            }
        ];

        const data: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03'],
            series: [testSeries]
        };

        // Apply alignment with includeFutureDates = true
        const result = getNewWithSifterToAlignExtremeDates(data, extremeSeries, 1, 2, true);

        // Find the base (unshifted) series
        const baseSeries = result.series.find(s => !s.name.includes('shifted by'));
        expect(baseSeries).toBeDefined();
        
        // Base series should have more values than original due to padding
        expect(baseSeries!.values.length).toBeGreaterThan(testSeries.values.length);
        
        // Check that padded values are proper ScalarDatapoint objects (not NaN)
        const paddedValue = baseSeries!.values[baseSeries!.values.length - 1];
        expect(paddedValue).toHaveProperty('virusLoad');
        expect((paddedValue as any).virusLoad).toBe(0);
        expect(typeof (paddedValue as any).virusLoad).toBe('number');
        expect(isNaN((paddedValue as any).virusLoad)).toBe(false);
    });

    test('does not pad when includeFutureDates is false', () => {
        const testSeries: PositivitySeries = {
            name: 'Test Series',
            values: [
                { positive: 10, tests: 100 },
                { positive: 20, tests: 100 },
                { positive: 30, tests: 100 }
            ],
            type: 'raw',
            frequencyInDays: 1,
            dataType: 'positivity'
        };

        const extremeSeries: ExtremeSeries[] = [
            {
                name: 'Test Series maxima over 3d',
                originalSeriesName: 'Test Series',
                indices: [1, 2],
                type: 'extreme',
                extreme: 'maxima'
            }
        ];

        const data: TimeseriesData = {
            dates: ['2022-01-01', '2022-01-02', '2022-01-03'],
            series: [testSeries]
        };

        // Apply alignment with includeFutureDates = false
        const result = getNewWithSifterToAlignExtremeDates(data, extremeSeries, 1, 2, false);

        // Find the base (unshifted) series
        const baseSeries = result.series.find(s => !s.name.includes('shifted by'));
        expect(baseSeries).toBeDefined();
        
        // Base series should have same number of values as original (no padding)
        expect(baseSeries!.values.length).toBe(testSeries.values.length);
    });
});

describe('compareLabels Tests', () => {
    test('sorts regular positivity series before shifted positivity', () => {
        expect(compareLabels('PCR Positivity', 'PCR Positivity shifted by 1 wave 56d')).toBeLessThan(0);
        expect(compareLabels('Antigen Positivity', 'Antigen Positivity shifted by -100d')).toBeLessThan(0);
    });

    test('sorts positivity series before test number series', () => {
        expect(compareLabels('PCR Positivity', 'PCR Positivity - Positive Tests')).toBeLessThan(0);
        expect(compareLabels('Influenza Positivity', 'Influenza Positivity - Negative Tests')).toBeLessThan(0);
    });

    test('sorts positive tests before negative tests', () => {
        expect(compareLabels('PCR Positivity - Positive Tests', 'PCR Positivity - Negative Tests')).toBeLessThan(0);
        expect(compareLabels('Antigen Positivity - Positive Tests', 'Antigen Positivity - Negative Tests')).toBeLessThan(0);
        
        // Shifted test numbers should also maintain positive before negative ordering
        expect(compareLabels(
            'PCR Positivity - Positive Tests shifted by 1 wave 56d',
            'PCR Positivity - Negative Tests shifted by 1 wave 56d'
        )).toBeLessThan(0);
    });

    test('sorts non-shifted test numbers before shifted test numbers', () => {
        expect(compareLabels('PCR Positivity - Positive Tests', 'PCR Positivity - Positive Tests shifted by 1 wave 56d')).toBeLessThan(0);
    });

    test('sorts alphabetically within same type category', () => {
        // Both are regular positivity series, should sort alphabetically
        expect(compareLabels('Adenovirus Positivity', 'RSV Positivity')).toBeLessThan(0);
        expect(compareLabels('RSV Positivity', 'Adenovirus Positivity')).toBeGreaterThan(0);
        expect(compareLabels('Same Label', 'Same Label')).toBe(0);
    });

    test('handles Czech language labels correctly', () => {
        // Czech "pozitivita" should be treated same as "Positivity"
        expect(compareLabels('PCR pozitivita', 'PCR pozitivita posunuto o 1 vlna 56d')).toBeLessThan(0);
        expect(compareLabels('PCR pozitivita', 'PCR pozitivita - pozitivní testy')).toBeLessThan(0);
        expect(compareLabels('PCR pozitivita - pozitivní testy', 'PCR pozitivita - negativní testy')).toBeLessThan(0);
    });

    test('handles empty strings', () => {
        // Empty strings are equal to each other
        expect(compareLabels('', '')).toBe(0);
        
        // Empty strings sort using localeCompare's behavior
        // In most locales, empty strings sort before non-empty strings
        const result1 = compareLabels('PCR Positivity', '');
        const result2 = compareLabels('', 'PCR Positivity');
        // Verify they have opposite signs (one positive, one negative)
        expect(result1 * result2).toBeLessThan(0);
    });

    test('complex sorting scenario with multiple series types', () => {
        const labels = [
            'PCR Positivity (28d avg) shifted by 1 wave 56d',
            'PCR Positivity - Positive Tests',
            'RSV Positivity',
            'Antigen Positivity',
            'PCR Positivity - Negative Tests',
            'PCR Positivity (28d avg)',
            'Influenza Positivity shifted by -100d',
            'PCR Positivity',
            'PCR Positivity - Positive Tests shifted by 1 wave 56d',
            'PCR Positivity - Negative Tests shifted by 1 wave 56d'
        ];
        
        const sorted = [...labels].sort(compareLabels);
        
        // Expected order by type:
        // 1. Regular positivity (alphabetically)
        // 2. Shifted positivity (alphabetically)
        // 3. Positive tests (non-shifted)
        // 4. Negative tests (non-shifted)
        // 5. Shifted positive tests
        // 6. Shifted negative tests
        
        // Regular positivity (type 0) - should be first 4
        expect(sorted[0]).toBe('Antigen Positivity');
        expect(sorted[1]).toBe('PCR Positivity');
        expect(sorted[2]).toBe('PCR Positivity (28d avg)');
        expect(sorted[3]).toBe('RSV Positivity');
        
        // Shifted positivity (type 1) - next 2
        expect(sorted[4]).toBe('Influenza Positivity shifted by -100d');
        expect(sorted[5]).toBe('PCR Positivity (28d avg) shifted by 1 wave 56d');
        
        // Positive tests non-shifted (type 2) - next 1
        expect(sorted[6]).toBe('PCR Positivity - Positive Tests');
        
        // Negative tests non-shifted (type 3) - next 1
        expect(sorted[7]).toBe('PCR Positivity - Negative Tests');
        
        // Shifted positive tests (type 5) - next 1
        expect(sorted[8]).toBe('PCR Positivity - Positive Tests shifted by 1 wave 56d');
        
        // Shifted negative tests (type 6) - last 1
        expect(sorted[9]).toBe('PCR Positivity - Negative Tests shifted by 1 wave 56d');
    });

    test('other series types sort after test numbers', () => {
        const labels = [
            'PCR Positivity',
            'Some Other Metric',
            'Wastewater Data',
            'PCR Positivity - Positive Tests'
        ];
        
        const sorted = [...labels].sort(compareLabels);
        
        // Positivity first, test numbers second, other types last
        expect(sorted[0]).toBe('PCR Positivity');
        expect(sorted[1]).toBe('PCR Positivity - Positive Tests');
        // Other types should be after
        expect(sorted[2]).toBe('Some Other Metric');
        expect(sorted[3]).toBe('Wastewater Data');
    });
});
