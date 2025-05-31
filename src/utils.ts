import { LineController } from "chart.js";

export interface TimeseriesData {
    dates: string[];
    series: LinearSeries[];
}

export interface Datapoint {
    positive: number;
    tests: number;
}

export interface LinearSeries {
    name: string;
    values: Datapoint[];
    type: 'raw' | 'averaged';
    windowSizeInDays?: number;
    frequencyInDays: number;
}

export interface ExtremeSeries {
    name: string;
    originalSeriesName: string;
    indices: number[];
}

export function addShiftedToAlignExtremeDates(
    data: TimeseriesData,
    extremeSeries: ExtremeSeries[],
    extremeIndexShiftFrom: number,
    extremeIndexShiftTo: number,
    includeFutureDates: boolean = false
): TimeseriesData {
    function getShift(extreme: ExtremeSeries) {
        return (
            extreme.indices[extreme.indices.length - extremeIndexShiftTo] -
            extreme.indices[extreme.indices.length - extremeIndexShiftFrom]
        );
    }

    function extendDatesIfNeeded(dates: string[], extraCount: number, freqDays: number): string[] {
        if (extraCount <= 0) return dates;
        const lastDate = new Date(dates[dates.length - 1]);
        const extraDates = Array.from({ length: extraCount }, (_, i) => {
            const d = new Date(lastDate.getTime() + freqDays * 24 * 60 * 60 * 1000 * (i + 1));
            return d.toISOString().split('T')[0];
        });
        return [...dates, ...extraDates];
    }

    // Calculate all shifts and how many extra dates are needed
    const allShifts = data.series.flatMap(series =>
        extremeSeries
            .filter(extreme => extreme.originalSeriesName === series.name)
            .map(getShift)
    );
    const negativeShifts = allShifts.filter(s => s < 0);
    const extraCount = includeFutureDates && negativeShifts.length > 0
        ? Math.max(...negativeShifts.map(s => -s))
        : 0;

    const freqDays = data.series[0]?.frequencyInDays ?? 1;
    const newDates = includeFutureDates ? extendDatesIfNeeded(data.dates, extraCount, freqDays) : data.dates;

    function buildShiftedSeries(series: LinearSeries): LinearSeries[] {
        const shifts = extremeSeries
            .filter(extreme => extreme.originalSeriesName === series.name)
            .map(extreme => {
                const shiftByIndexes = getShift(extreme);
                const length = series.values.length + (includeFutureDates ? extraCount : 0);
                const shiftedValues = Array.from({ length }, (_, i) => {
                    const idx = i + shiftByIndexes;
                    return idx < 0 || idx >= series.values.length ? { positive: 0, tests: NaN } : series.values[idx];
                });
                return {
                    name: `${series.name} shifted by ${shiftByIndexes * series.frequencyInDays}d`,
                    type: series.type,
                    values: shiftedValues,
                    frequencyInDays: series.frequencyInDays,
                    ...(series.windowSizeInDays ? { windowSizeInDays: series.windowSizeInDays } : {})
                };
            });
        const originalPadded = includeFutureDates && extraCount > 0
            ? [...series.values, ...Array(extraCount).fill(NaN)]
            : series.values;
        const base = { ...series, values: originalPadded };
        return shifts.length > 0 ? [...shifts, base] : [base];
    }

    const shiftedSeries = data.series.flatMap(buildShiftedSeries);
    return { dates: newDates, series: shiftedSeries };
}

export function windowSizeDaysToIndex(windowSizeInDays: number | undefined, frequencyInDays: number): number {
    return Math.round((windowSizeInDays ?? 1) / frequencyInDays);
}

export function computeMovingAverageTimeseries(data: TimeseriesData, windowSizes: number[]): TimeseriesData {
    const averagedSeries = data.series.flatMap(series => {
        const adjustedWindowSizes = windowSizes.map(w => windowSizeDaysToIndex(w, series.frequencyInDays));
        return adjustedWindowSizes.map((windowSizeInIndex, i) => {
            const averagedValues = series.values.map((v, j) => {
                let sumPos = 0;
                let sumTotal = 0;
                for (let k = -Math.floor(windowSizeInIndex/2); k <= Math.floor(windowSizeInIndex/2); k++) {
                    let index = j + k;

                    // Skipping technically means edge values are less "averaged" but any bias for the last value
                    // Can be overly strong. This is a decent trade-off. Some bias due to less averaged values, but
                    // not just repeating the last/first value.
                    if (index < 0) continue; // Skip negative indices
                    if (index >= series.values.length) continue; // Skip out of bounds
                    
                    sumPos += series.values[index].positive;
                    sumTotal += series.values[index].tests;
                }
                return { positive: sumPos, tests: sumTotal };
            })
            const originalWindowSize = windowSizes[i];
            return {
                name: `${series.name} (${originalWindowSize}d avg)`,
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

    const localMaximaIndices: number[] = [];
    for (let i = 1; i < series.values.length - 1; i++) {
        if (isExtremeWindow(series, i, windowSizeDaysToIndex(desiredWindowSizeInDays, series.frequencyInDays), extreme)) {
            localMaximaIndices.push(i);
        }
    }
    if (localMaximaIndices.length === 0) {
        console.warn(`No ${extreme} found in series ${series.name} with window size ${desiredWindowSizeInDays} days`);
        return [];
    }

    maximaSeries.push({ name: `${series.name} ${extreme} over ${desiredWindowSizeInDays}d`, originalSeriesName: series.name, indices: localMaximaIndices });

    return maximaSeries;
}

function isExtremeWindow(series: LinearSeries, index: number, windowSizeInIndex: number, extreme: 'maxima'|'minima'): boolean {
    const halfWindowSize = Math.floor(windowSizeInIndex / 2);
    const start = Math.max(0, index - halfWindowSize);
    const end = Math.min(series.values.length - 1, index + halfWindowSize);

    const indexVal = datapointToPercentage(series.values[index]);
    for (let i = start; i <= end; i++) {
        if (i === index) continue; // Skip self-comparison

        const iVal = datapointToPercentage(series.values[i]);
        if (extreme === 'maxima' && iVal >= indexVal) { return false; }
        else if (extreme === 'minima' && iVal <= indexVal) { return false; }
    }

    return true;
}

export interface RatioData {
    seriesName: string;
    ratio7days: number | null;
    ratio28days: number | null;
    lastDataDate: Date | null;
}

export function calculateRatios(data: TimeseriesData, visibleMainSeries: string[]): RatioData[] {
    const today = new Date().toISOString().split('T')[0];
    const preTodayIndex = data.dates.findLastIndex(date => date <= today);
    
    if (preTodayIndex < 0) return [];
    
    return visibleMainSeries.map(seriesName => {
        const series = data.series.find(s => s.name === seriesName);
        if (!series) return { seriesName, ratio7days: null, ratio28days: null, lastDataDate: null };
        
        console.log(`Calculating ratios for series: ${seriesName}`);
        const ratio7days = calculatePeriodRatio(series, preTodayIndex, 7);
        const ratio28days = calculatePeriodRatio(series, preTodayIndex, 28);
        
        return {
            seriesName,
            ratio7days,
            ratio28days,
            lastDataDate: new Date(data.dates[preTodayIndex])
        };
    });
}

function calculatePeriodRatio(serie: LinearSeries, endIndex: number, periodDays: number): number | null {
    const periodIndices = Math.floor(periodDays / serie.frequencyInDays);
    
    // Calculate current period average (last N days)
    const currentStart = Math.max(0, endIndex - periodIndices + 1);
    const currentEnd = endIndex + 1;
    
    // Calculate previous period average (N days before that)
    const previousStart = Math.max(0, currentStart - periodIndices);
    const previousEnd = currentStart;
    
    if (previousStart >= previousEnd || currentStart >= currentEnd) return null;
    
    const currentValues = serie.values.slice(currentStart, currentEnd);
    const previousValues = serie.values.slice(previousStart, previousEnd);
    
    if (currentValues.length === 0 || previousValues.length === 0) return null;
    
    const current = currentValues.reduce((sum, val) => {sum.positive += val.positive; sum.tests += val.tests; return sum;}, {positive: 0, tests: 0});
    const previous = previousValues.reduce((sum, val) => {sum.positive += val.positive; sum.tests += val.tests; return sum;}, {positive: 0, tests: 0});

    const currentAvg = datapointToPercentage(current);
    const previousAvg = datapointToPercentage(previous);

    return currentAvg / previousAvg;
}

export function datapointToPercentage(datapoint: Datapoint | undefined): number {
    if (!datapoint || datapoint.tests === 0) return NaN;
    return (datapoint.positive / datapoint.tests) * 100;
}
