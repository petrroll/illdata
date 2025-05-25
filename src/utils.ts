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
                    return idx < 0 || idx >= series.values.length ? NaN : series.values[idx];
                });
                return {
                    name: `${series.name} SHIFTED -${shiftByIndexes * series.frequencyInDays} day(s)`,
                    type: 'raw' as const,
                    values: shiftedValues,
                    frequencyInDays: series.frequencyInDays
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

    const localMaximaIndices: number[] = [];
    for (let i = 1; i < series.values.length - 1; i++) {
        if (isExtremeWindow(series.values, i, windowSizeDaysToIndex(desiredWindowSizeInDays, series.frequencyInDays), extreme)) {
            localMaximaIndices.push(i);
        }
    }
    maximaSeries.push({ name: `${series.name} ${extreme} over ${desiredWindowSizeInDays}d`, originalSeriesName: series.name, indices: localMaximaIndices });

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

export interface RatioData {
    seriesName: string;
    ratio7days: number | null;
    ratio28days: number | null;
}

export function calculateRatios(data: TimeseriesData, visibleMainSeries: string[]): RatioData[] {
    const today = new Date().toISOString().split('T')[0];
    const todayIndex = data.dates.findLastIndex(date => date <= today);
    
    if (todayIndex < 0) return [];
    
    return visibleMainSeries.map(seriesName => {
        const series = data.series.find(s => s.name === seriesName);
        if (!series) return { seriesName, ratio7days: null, ratio28days: null };
        
        console.log(`Calculating ratios for series: ${seriesName}`);
        const ratio7days = calculatePeriodRatio(series.values, todayIndex, 7, series.frequencyInDays);
        const ratio28days = calculatePeriodRatio(series.values, todayIndex, 28, series.frequencyInDays);
        
        return {
            seriesName,
            ratio7days,
            ratio28days
        };
    });
}

function calculatePeriodRatio(values: number[], endIndex: number, periodDays: number, frequencyInDays: number): number | null {
    const periodIndices = Math.floor(periodDays / frequencyInDays);
    
    // Calculate current period average (last N days)
    const currentStart = Math.max(0, endIndex - periodIndices + 1);
    const currentEnd = endIndex + 1;
    
    // Calculate previous period average (N days before that)
    const previousStart = Math.max(0, currentStart - periodIndices);
    const previousEnd = currentStart;
    
    if (previousStart >= previousEnd || currentStart >= currentEnd) return null;
    
    const currentValues = values.slice(currentStart, currentEnd).filter(v => !isNaN(v) && v !== null);
    const previousValues = values.slice(previousStart, previousEnd).filter(v => !isNaN(v) && v !== null);
    
    if (currentValues.length === 0 || previousValues.length === 0) return null;
    
    const currentAvg = currentValues.reduce((sum, val) => sum + val, 0) / currentValues.length;
    const previousAvg = previousValues.reduce((sum, val) => sum + val, 0) / previousValues.length;

    console.log(`Current Avg: ${currentAvg}, Previous Avg: ${previousAvg}`);
    
    if (previousAvg === 0) return null;
    
    return currentAvg / previousAvg;
}
