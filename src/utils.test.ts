import { 
	findLocalExtreme, 
	computeMovingAverageTimeseries,
	type LinearSeries, 
	type ExtremeSeries,
	type TimeseriesData
} from './utils';

describe('findLocalExtreme - Local Maxima Tests', () => {
    const seriesMax: LinearSeries = {
        name: 'Averaged Series',
        values: [1, 3, 2, 4, 1],
        type: 'averaged',
        windowSizeInIndex: 3,
		frequencyInDays: 1
    };

    test('filters time series of type averaged (maxima)', () => {
        const result: ExtremeSeries[] = findLocalExtreme(seriesMax, 3, 'maxima');
        expect(result).toEqual([{ name: 'Averaged Series maxima', originalSeriesName: 'Averaged Series', indices: [1, 3] }]);
    });

    test('selects the provided window size (maxima)', () => {
        const alteredSeries = { ...seriesMax, values: [1, 5, 3, 7, 2, 6, 1] };
        const result: ExtremeSeries[] = findLocalExtreme(alteredSeries, 3, 'maxima');
        // Expect indices for local peaks that are not on the edge.
        expect(result).toEqual([{ name: 'Averaged Series maxima', originalSeriesName: 'Averaged Series', indices: [1, 3, 5] }]);
    });

    test('does not consider local maxima at the edge of the array', () => {
        const edgeSeries = { ...seriesMax, values: [5, 1, 4, 1, 5] };
        const result: ExtremeSeries[] = findLocalExtreme(edgeSeries, 3, 'maxima');
        // Even though 5 is high at the edges, only the center index qualifies.
        expect(result).toEqual([{ name: 'Averaged Series maxima', originalSeriesName: 'Averaged Series', indices: [2] }]);
    });
});

describe('findLocalExtreme - Local Minima Tests', () => {
    const seriesMin: LinearSeries = {
        name: 'Averaged Series',
        values: [4, 2, 3, 1, 5],
        type: 'averaged',
        windowSizeInIndex: 3,
		frequencyInDays: 1,
    };

    test('filters time series of type averaged (minima)', () => {
        const result: ExtremeSeries[] = findLocalExtreme(seriesMin, 3, 'minima');
        expect(result).toEqual([{ name: 'Averaged Series minima', originalSeriesName: 'Averaged Series', indices: [1, 3] }]);
    });

    test('finds all local minima and returns their index', () => {
        const variedSeries = { ...seriesMin, values: [6, 2, 4, 1, 3, 0, 4] };
        const result: ExtremeSeries[] = findLocalExtreme(variedSeries, 3, 'minima');
        // Assuming indices for minima excluding the very first and last values.
        expect(result).toEqual([{ name: 'Averaged Series minima', originalSeriesName: 'Averaged Series', indices: [1, 3, 5] }]);
    });

    test('does not consider local minima at the edge of the array', () => {
        const edgeMinSeries = { ...seriesMin, values: [1, 3, 1, 3, 1] };
        const result: ExtremeSeries[] = findLocalExtreme(edgeMinSeries, 3, 'minima');
        // Only the center index qualifies as a local minimum.
        expect(result).toEqual([{ name: 'Averaged Series minima', originalSeriesName: 'Averaged Series', indices: [2] }]);
    });
});

describe('computeMovingAverageTimeseries Tests', () => {
	test('computes moving average for one series with a single window size', () => {
		const input: TimeseriesData = {
			dates: ['2022-01-01', '2022-01-02', '2022-01-03', '2022-01-04', '2022-01-05'],
			series: [{
				name: 'Test Series',
				values: [1, 2, 3, 4, 5],
				type: 'raw',
				frequencyInDays: 1
			}]
		};
		const windowSizes = [3];
		const result = computeMovingAverageTimeseries(input, windowSizes);
		// Expected moving averages for windowSize 3:
		// index 0: (1+1+2)/3 = 1.3333..., 1: (1+2+3)/3 = 2, 2: (2+3+4)/3 = 3,
		// 3: (3+4+5)/3 = 4, 4: (4+5+5)/3 = 4.6667...
		const expectedAvg = [1.3333333333333333, 2, 3, 4, 4.666666666666667];
		// Expect original series + new averaged series appended.
		expect(result.dates).toEqual(input.dates);
		expect(result.series).toHaveLength(input.series.length + 1);
		expect(result.series[input.series.length]).toEqual({
			name: 'Test Series - 3 day(s) avg',
			values: expectedAvg,
			type: 'averaged',
			windowSizeInIndex: 3,
			frequencyInDays: 1
		});
	});

	test('computes moving averages for multiple window sizes', () => {
		const input: TimeseriesData = {
			dates: ['D1', 'D2', 'D3', 'D4', 'D5'],
			series: [{
				name: 'Multi Window',
				values: [10, 20, 30, 40, 50],
				type: 'raw',
				frequencyInDays: 1
			}]
		};
		const windowSizes = [3, 5];
		const result = computeMovingAverageTimeseries(input, windowSizes);
		// For windowSize 3:
		// index 0: (10+10+20)/3 = 13.3333, 1: (10+20+30)/3 = 20,
		// index 2: (20+30+40)/3 = 30, 3: (30+40+50)/3 = 40,
		// index 4: (40+50+50)/3 = 46.6667
		const expectedAvg3 = [13.333333333333334, 20, 30, 40, 46.666666666666664];
		const expectedAvg5 = [16, 22, 30, 38, 44];
		expect(result.series).toHaveLength(input.series.length + 2);
		expect(result.series[input.series.length]).toEqual({
			name: 'Multi Window - 3 day(s) avg',
			values: expectedAvg3,
			type: 'averaged',
			windowSizeInIndex: 3,
			frequencyInDays: 1
		});
		expect(result.series[input.series.length + 1]).toEqual({
			name: 'Multi Window - 5 day(s) avg',
			values: expectedAvg5,
			type: 'averaged',
			windowSizeInIndex: 5,
			frequencyInDays: 1
		});
	});
});
