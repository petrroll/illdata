import { findLocalMaxima, type LinearSeries, type MaximaSeries } from './utils';

describe('findLocalMaxima', () => {
    const series: LinearSeries = {
        name: 'Averaged Series',
        values: [1, 3, 2, 4, 1],
        type: 'averaged',
        windowsize: 3
    };

    test('filters time series of type averaged', () => {
        const result: MaximaSeries[] = findLocalMaxima(series, 3);
        expect(result).toEqual([{ name: 'Averaged Series', indices: [1, 3] }]);
    });

    test('selects the provided window size', () => {
        const result: MaximaSeries[] = findLocalMaxima(series, 3);
        expect(result).toEqual([{ name: 'Averaged Series', indices: [1, 3] }]);
    });

    test('finds all local maxima and returns their index', () => {
        const result: MaximaSeries[] = findLocalMaxima(series, 3);
        expect(result).toEqual([{ name: 'Averaged Series', indices: [1, 3] }]);
    });

    test('does not consider local maxima at the edge of the array', () => {
        const result: MaximaSeries[] = findLocalMaxima(series, 3);
        expect(result).toEqual([{ name: 'Averaged Series', indices: [1, 3] }]);
    });
});
