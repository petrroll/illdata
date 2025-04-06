import { LineController } from "chart.js";

export interface TimeseriesData {
    dates: string[];
    series: LinearSeries[];
}

export interface LinearSeries {
    name: string;
    values: number[];
    type: 'raw' | 'averaged';
    windowSizeInDays?: number;
    frequencyInDays: number;
}

export interface ExtremeSeries {
    name: string;
    originalSeriesName: string;
    indices: number[];
}

export function addShiftedToAlignExtremeDates(data: TimeseriesData, extremeSeries: ExtremeSeries[], extremeIndexShiftFrom: number, extremeIndexShiftTo: number): TimeseriesData {
    const shiftedSeries = data.series.flatMap(series => {
        const shifts = extremeSeries
            .filter(extreme => extreme.originalSeriesName === series.name)
            .map(extreme => {
                const shiftedByIndexes = extreme.indices[extreme.indices.length-extremeIndexShiftTo] - extreme.indices[extreme.indices.length-extremeIndexShiftFrom];
                const shiftedValues = series.values.map((v, i) => {
                    return series.values[i + shiftedByIndexes];
                });
                return { 
                    name: `${series.name} SHIFTED -${shiftedByIndexes * series.frequencyInDays} day(s)`, 
                    type: 'raw' as 'raw', 
                    values: shiftedValues,
                    frequencyInDays: series.frequencyInDays 
                };
            });
        
        return shifts.length > 0 ? [...shifts, series] : [series];
    });

    return { dates: data.dates, series: shiftedSeries };
}

export function windowSizeDaysToIndex(windowSizeInDays: number | undefined, frequencyInDays: number): number {
    return Math.round((windowSizeInDays ?? 1) / frequencyInDays);
}

export function computeMovingAverageTimeseries(data: TimeseriesData, windowSizes: number[]): TimeseriesData {
    const averagedSeries = data.series.flatMap(series => {
        const adjustedWindowSizes = windowSizes.map(w => windowSizeDaysToIndex(w, series.frequencyInDays));
        return adjustedWindowSizes.map((windowSizeInIndex, i) => {
            const averagedValues = series.values.map((v, j) => {
                let sum = 0;
                let count = 0;
                for (let k = -Math.floor(windowSizeInIndex/2); k <= Math.floor(windowSizeInIndex/2); k++) {
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
                name: `${series.name} - ${originalWindowSize} day(${originalWindowSize === 1 ? '' : 's'}) avg`,
                values: averagedValues,
                type: 'averaged',
                windowSizeInDays: windowSizes[i],
                frequencyInDays: series.frequencyInDays
            } as LinearSeries;
        });
    });

    return {
        dates: data.dates,
        series: [...data.series, ...averagedSeries]
    };
}

export function findLocalExtreme(series: LinearSeries, desiredWindowSizeInDays: number, extreme: 'maxima'|'minima'): ExtremeSeries[] {
    const maximaSeries: ExtremeSeries[] = [];

    if (series.type === 'averaged' && series.windowSizeInDays === desiredWindowSizeInDays) {
        const localMaximaIndices: number[] = [];
        for (let i = 1; i < series.values.length - 1; i++) {
            if (isExtremeWindow(series.values, i, windowSizeDaysToIndex(series.windowSizeInDays, series.frequencyInDays), extreme)) {
                localMaximaIndices.push(i);
            }
        }
        maximaSeries.push({ name: `${series.name} ${extreme}`, originalSeriesName: series.name, indices: localMaximaIndices });
    }

    return maximaSeries;
}

function isExtremeWindow(series: number[], index: number, windowSizeInIndex: number, extreme: 'maxima'|'minima'): boolean {
    const halfWindowSize = Math.floor(windowSizeInIndex / 2);
    const start = Math.max(0, index - halfWindowSize);
    const end = Math.min(series.length - 1, index + halfWindowSize);

    for (let i = start; i <= end; i++) {
        if (i === index) continue; // Skip self-comparison
        if (extreme === 'maxima' && series[i] >= series[index]) { return false; }
        else if (extreme === 'minima' && series[i] <= series[index]) { return false; }
    }

    return true;
}
