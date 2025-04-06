import { LineController } from "chart.js";

export interface TimeseriesData {
    dates: string[];
    series: LinearSeries[];
    frequencyInDays: number;
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

export function shiftToAlignExtremeDates(data: TimeseriesData, extremeSeries: ExtremeSeries, extremeIndexShiftFrom: number, extremeIndexShiftTo: number): TimeseriesData {
    const shiftedSeries = data.series.flatMap(series => {
        if (series.name === extremeSeries.originalSeriesName) {
            const shiftedByIndexes = extremeSeries.indices[extremeSeries.indices.length-extremeIndexShiftTo] - extremeSeries.indices[extremeSeries.indices.length-extremeIndexShiftFrom]
            const shiftedValues = series.values.map((v, i) => {
                return series.values[i + shiftedByIndexes];
            });
            return [{ name: `${series.name} SHIFTED -${shiftedByIndexes} ${data.frequencyInDays}`, type: 'raw' as `raw`, values: shiftedValues }, series];
        } else {
            return [series];
        }
    });

    return { dates: data.dates, series: shiftedSeries, frequencyInDays: data.frequencyInDays };
}

export function computeMovingAverageTimeseries(data: TimeseriesData, windowSizes: number[]): TimeseriesData {
    const adjustedWindowSizes = windowSizes.map(w => Math.max(1, Math.round(w / data.frequencyInDays)));

    const averagedSeries = data.series.flatMap(series => {
        return adjustedWindowSizes.map((windowSize, i) => {
            const averagedValues = series.values.map((v, j) => {
                let sum = 0;
                let count = 0;
                for (let k = -Math.floor(windowSize/2); k <= Math.floor(windowSize/2); k++) {
                    const index = j + k;
                    count += 1;
                    if (index >= 0 && index < series.values.length) {
                        sum += series.values[index];
                    } else if (index < 0) {
                        sum += series.values[0];
                    } else if (index >= series.values.length) {
                        sum += series.values[series.values.length - 1];
                    }
                }
                return sum / count;
            })
            const originalWindowSize = windowSizes[i];
            return {
                name: `${series.name} - ${originalWindowSize} day${originalWindowSize === 1 ? '' : 's'} avg`,
                values: averagedValues,
                type: 'averaged',
                windowsize: originalWindowSize
            } as LinearSeries;
        });
    });

    return {
        dates: data.dates,
        series: [...data.series, ...averagedSeries],
        frequencyInDays: data.frequencyInDays
    };
}

export function findLocalExtreme(series: LinearSeries, windowSize: number, extreme: 'maxima'|'minima'): ExtremeSeries[] {
    const maximaSeries: ExtremeSeries[] = [];

    if (series.type === 'averaged' && series.windowsize === windowSize) {
        const localMaximaIndices: number[] = [];
        for (let i = 1; i < series.values.length - 1; i++) {
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
        if (i === index) continue; // Skip self-comparison
        if (extreme === 'maxima' && series[i] >= series[index]) { return false; }
        else if (extreme === 'minima' && series[i] <= series[index]) { return false; }
    }

    return true;
}
