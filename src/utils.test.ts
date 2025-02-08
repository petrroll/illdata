import { findLocalMaxima, TimeseriesData } from './utils';

describe('findLocalMaxima', () => {
    const timeseriesArray: TimeseriesData[] = [
        {
            dates: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
            series: [
                {
                    name: 'Averaged Series',
                    values: [1, 3, 2, 4, 1],
                    type: 'averaged',
                    windowsize: 3
                }
            ]
        }
    ];

    test('filters time series of type averaged', () => {
        const result = findLocalMaxima(timeseriesArray, 3);
        expect(result).toEqual([1, 3]);
    });

    test('selects the provided window size', () => {
        const result = findLocalMaxima(timeseriesArray, 3);
        expect(result).toEqual([1, 3]);
    });

    test('finds all local maxima and returns their index', () => {
        const result = findLocalMaxima(timeseriesArray, 3);
        expect(result).toEqual([1, 3]);
    });

    test('does not consider local maxima at the edge of the array', () => {
        const result = findLocalMaxima(timeseriesArray, 3);
        expect(result).toEqual([1, 3]);
    });
});
