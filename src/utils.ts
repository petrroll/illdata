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

export interface MaximaSeries {
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

export function findLocalMaxima(series: LinearSeries, windowSize: number): MaximaSeries[] {
    const maximaSeries: MaximaSeries[] = [];

    if (series.type === 'averaged' && series.windowsize === windowSize) {
        const localMaximaIndices: number[] = [];
        for (let i = 0; i < series.values.length; i++) {
            if (isMaximaInWindow(series.values, i, windowSize)) {
                localMaximaIndices.push(i);
            }
        }
        maximaSeries.push({ name: `${series.name} Local Maxima`, originalSeriesName: series.name, indices: localMaximaIndices });
    }

    return maximaSeries;
}

function isMaximaInWindow(series: number[], index: number, windowSize: number): boolean {
    const halfWindowSize = Math.floor(windowSize / 2);
    const start = Math.max(0, index - halfWindowSize);
    const end = Math.min(series.length - 1, index + halfWindowSize);

    for (let i = start; i <= end; i++) {
        if (series[i] >= series[index]) {
            return false;
        }
    }

    return true;
}
