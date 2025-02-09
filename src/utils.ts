export interface TimeseriesData {
    dates: string[];
    series: LinearSeries[];
}

export interface LinearSeries {
    name: string;
    values: number[];
    type: 'raw' | 'averaged';
    windowsize?: number;
}

export interface ExtremeSeries {
    name: string;
    originalSeriesName: string;
    indices: number[];
}

export function computeMovingAverageTimeseries(data: TimeseriesData, windowSizes: number[]): TimeseriesData {
    const averagedSeries = data.series.flatMap(series => {
        return windowSizes.map(windowSize => {
            const averagedValues = series.values.map((v, i) => {
                let sum = 0;
                let count = 0;
                for (let j = Math.floor(-windowSize/2); j <= Math.floor(windowSize/2); j++) {
                    const index = i + j;
                    count += 1;
                    if (index >= 0 && index < series.values.length) {
                        sum += series.values[index];
                    } else if (index < 0) {
                        sum += series.values[0]; // Assume the same value as the first datapoint if there are no days prior
                    } else if (index >= series.values.length) {
                        sum += series.values[series.values.length - 1]; // Assume the same value as the last datapoint if there are no future days
                    }
                }
                return sum / count;
            })
            return {
                name: `${series.name} - ${windowSize}day avg`,
                values: averagedValues,
                type: 'averaged',
                windowsize: windowSize
            } as LinearSeries;
        });
    });

    return {
        dates: data.dates,
        series: [...data.series, ...averagedSeries],
    };
}

export function findLocalExtreme(series: LinearSeries, windowSize: number, extreme: 'maxima'|'minima'): ExtremeSeries[] {
    const maximaSeries: ExtremeSeries[] = [];

    if (series.type === 'averaged' && series.windowsize === windowSize) {
        const localMaximaIndices: number[] = [];
        for (let i = 0; i < series.values.length; i++) {
            if (isExtremeWindow(series.values, i, windowSize, extreme)) {
                localMaximaIndices.push(i);
            }
        }
        maximaSeries.push({ name: `${series.name} ${extreme}`, originalSeriesName: series.name, indices: localMaximaIndices });
    }

    return maximaSeries;
}

function isExtremeWindow(series: number[], index: number, windowSize: number, extreme: 'maxima'|'minima'): boolean {
    const halfWindowSize = Math.floor(windowSize / 2);
    const start = Math.max(0, index - halfWindowSize);
    const end = Math.min(series.length - 1, index + halfWindowSize);

    for (let i = start; i <= end; i++) {
        if (extreme === 'maxima' && series[i] >= series[index]) { return false; }
        else if (extreme === 'minima' && series[i] <= series[index]) { return false; }
    }

    return true;
}
