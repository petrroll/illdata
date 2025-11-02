// Chart.js is used elsewhere in the project

export type DataSeries = PositivitySeries | ScalarSeries;

export interface TimeseriesData {
    dates: string[];
    series: DataSeries[];
}

export interface Datapoint {
    positive: number;
    tests: number;
}

export interface ScalarDatapoint {
    virusLoad: number;
}

// Base interface for all linear series (series with values over time)
export interface LinearSeries {
    name: string;
    type: 'raw' | 'averaged';
    windowSizeInDays?: number;
    shiftedByIndexes?: number;
    frequencyInDays: number;
}

export interface PositivitySeries extends LinearSeries {
    values: Datapoint[];
    dataType: 'positivity';
}

export interface ScalarSeries extends LinearSeries {
    values: ScalarDatapoint[];
    dataType: 'scalar';
}

export interface ExtremeSeries {
    name: string;
    originalSeriesName: string;
    indices: number[];
    type: 'extreme';
    extreme: 'maxima'|'minima';
}

export type Series = DataSeries | ExtremeSeries;

export function getNewWithSifterToAlignExtremeDates(
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

    function buildShiftedSeries(series: DataSeries): DataSeries[] {
        const shifts = extremeSeries
            .filter(extreme => extreme.originalSeriesName === series.name)
            .map(extreme => {
                const shiftByIndexes = getShift(extreme);
                const length = series.values.length + (includeFutureDates ? extraCount : 0);
                
                if ('dataType' in series && series.dataType === 'scalar') {
                    const shiftedValues: ScalarDatapoint[] = Array.from({ length }, (_, i) => {
                        const idx = i + shiftByIndexes;
                        return idx < 0 || idx >= series.values.length ? { virusLoad: 0 } : series.values[idx];
                    });
                    return {
                        name: `${series.name} shifted by ${extremeIndexShiftTo - extremeIndexShiftFrom} wave ${shiftByIndexes * series.frequencyInDays}d`,
                        type: series.type,
                        shiftedByIndexes: shiftByIndexes,
                        values: shiftedValues,
                        frequencyInDays: series.frequencyInDays,
                        dataType: 'scalar' as const,
                        ...(series.windowSizeInDays ? { windowSizeInDays: series.windowSizeInDays } : {})
                    } as ScalarSeries;
                } else {
                    const shiftedValues: Datapoint[] = Array.from({ length }, (_, i) => {
                        const idx = i + shiftByIndexes;
                        return idx < 0 || idx >= series.values.length ? { positive: 0, tests: NaN } : (series as PositivitySeries).values[idx];
                    });
                    return {
                        name: `${series.name} shifted by ${extremeIndexShiftTo - extremeIndexShiftFrom} wave ${shiftByIndexes * series.frequencyInDays}d`,
                        type: series.type,
                        shiftedByIndexes: shiftByIndexes,
                        values: shiftedValues,
                        frequencyInDays: series.frequencyInDays,
                        dataType: 'positivity' as const,
                        ...(series.windowSizeInDays ? { windowSizeInDays: series.windowSizeInDays } : {})
                    } as PositivitySeries;
                }
            });
        const originalPadded = includeFutureDates && extraCount > 0
            ? [...series.values, ...Array(extraCount).fill(NaN)]
            : series.values;
        const base = { ...series, values: originalPadded };
        return shifts.length > 0 ? [...shifts, base] : [base];
    }

    const shiftedSeries: DataSeries[] = data.series.flatMap(buildShiftedSeries);
    return { dates: newDates, series: shiftedSeries };
}

export function windowSizeDaysToIndex(windowSizeInDays: number | undefined, frequencyInDays: number): number {
    return Math.round((windowSizeInDays ?? 1) / frequencyInDays);
}

export function computeMovingAverageTimeseries(data: TimeseriesData, windowSizes: number[]): TimeseriesData {
    const averagedSeries: DataSeries[] = data.series.flatMap((series): DataSeries[] => {
        const adjustedWindowSizes = windowSizes.map(w => windowSizeDaysToIndex(w, series.frequencyInDays));
        
        if ('dataType' in series && series.dataType === 'scalar') {
            // Handle scalar data (e.g., wastewater virus load)
            return adjustedWindowSizes.map((windowSizeInIndex, i) => {
                const averagedValues = series.values.map((v, j) => {
                    let sumLoad = 0;
                    let count = 0;
                    for (let k = -Math.floor(windowSizeInIndex/2); k <= Math.floor(windowSizeInIndex/2); k++) {
                        let index = j + k;
                        if (index < 0) continue;
                        if (index >= series.values.length) continue;
                        
                        const value = (series.values[index] as ScalarDatapoint).virusLoad;
                        if (value > 0) {  // Only count non-zero values
                            sumLoad += value;
                            count++;
                        }
                    }
                    return { virusLoad: count > 0 ? sumLoad / count : 0 };
                });
                const originalWindowSize = windowSizes[i];
                return {
                    name: `${series.name} (${originalWindowSize}d avg)`,
                    values: averagedValues,
                    type: 'averaged',
                    windowSizeInDays: windowSizes[i],
                    frequencyInDays: series.frequencyInDays,
                    dataType: 'scalar'
                } as ScalarSeries;
            });
        } else {
            // Handle positivity data
            return adjustedWindowSizes.map((windowSizeInIndex, i) => {
                const averagedValues = series.values.map((v, j) => {
                    let sumPos = 0;
                    let sumTotal = 0;
                    for (let k = -Math.floor(windowSizeInIndex/2); k <= Math.floor(windowSizeInIndex/2); k++) {
                        let index = j + k;
                        if (index < 0) continue;
                        if (index >= series.values.length) continue;
                        
                        sumPos += (series.values[index] as Datapoint).positive;
                        sumTotal += (series.values[index] as Datapoint).tests;
                    }
                    return { positive: sumPos, tests: sumTotal };
                });
                const originalWindowSize = windowSizes[i];
                return {
                    name: `${series.name} (${originalWindowSize}d avg)`,
                    values: averagedValues,
                    type: 'averaged',
                    windowSizeInDays: windowSizes[i],
                    frequencyInDays: series.frequencyInDays,
                    dataType: 'positivity'
                } as PositivitySeries;
            });
        }
    });

    return {
        dates: data.dates,
        series: [...data.series, ...averagedSeries]
    };
}

export function findLocalExtreme(series: DataSeries, desiredWindowSizeInDays: number, extreme: 'maxima'|'minima'): ExtremeSeries[] {
    const maximaSeries: ExtremeSeries[] = [];

    // Find all local extremes without filtering
    const extremeIndices: number[] = [];
    
    for (let i = 1; i < series.values.length - 1; i++) {
        if (isExtremeWindow(series, i, windowSizeDaysToIndex(desiredWindowSizeInDays, series.frequencyInDays), extreme)) {
            extremeIndices.push(i);
        }
    }
    
    if (extremeIndices.length === 0) {
        console.warn(`No ${extreme} found in series ${series.name} with window size ${desiredWindowSizeInDays} days`);
        return [];
    }

    maximaSeries.push({ 
        name: `${series.name} ${extreme} over ${desiredWindowSizeInDays}d`, 
        originalSeriesName: series.name, 
        indices: extremeIndices,
        type: 'extreme',
        extreme: extreme
    });

    return maximaSeries;
}

export function filterExtremesByMedianThreshold(series: DataSeries, maximaSeries: ExtremeSeries[], minimaSeries: ExtremeSeries[]): { filteredMaxima: ExtremeSeries[], filteredMinima: ExtremeSeries[] } {
    // Extract all maxima and minima indices from all extreme series
    const allMaximaIndices = maximaSeries.flatMap(extremeSeries => extremeSeries.indices);
    const allMinimaIndices = minimaSeries.flatMap(extremeSeries => extremeSeries.indices);

    // Filter maxima
    const filteredMaximaSeries = maximaSeries.map(extremeSeries => ({
        ...extremeSeries,
        indices: filterExtremes(series, allMaximaIndices, allMinimaIndices, 'maxima').filter(index => 
            extremeSeries.indices.includes(index)
        )
    })).filter(extremeSeries => extremeSeries.indices.length > 0);

    // Filter minima
    const filteredMinimaSeries = minimaSeries.map(extremeSeries => ({
        ...extremeSeries,
        indices: filterExtremes(series, allMaximaIndices, allMinimaIndices, 'minima').filter(index => 
            extremeSeries.indices.includes(index)
        )
    })).filter(extremeSeries => extremeSeries.indices.length > 0);

    return {
        filteredMaxima: filteredMaximaSeries,
        filteredMinima: filteredMinimaSeries
    };
}

function filterExtremes(series: DataSeries, maximaIndices: number[], minimaIndices: number[], requestedExtreme: 'maxima'|'minima'): number[] {

    // If we don't have both maxima and minima, return original indices
    if (maximaIndices.length === 0 || minimaIndices.length === 0) {
        return requestedExtreme === 'maxima' ? maximaIndices : minimaIndices;
    }

    // Get values for all detected extremes
    const maximaValues = maximaIndices.map(i => seriesValueToNumber(series, i)).filter(v => !isNaN(v));
    const minimaValues = minimaIndices.map(i => seriesValueToNumber(series, i)).filter(v => !isNaN(v));

    // Calculate medians
    const medianMaxima = calculateMedian(maximaValues);
    const medianMinima = calculateMedian(minimaValues);

    // If we can't calculate medians, return original indices
    if (isNaN(medianMaxima) || isNaN(medianMinima)) {
        return requestedExtreme === 'maxima' ? maximaIndices : minimaIndices;
    }

    // Calculate halfway point
    const halfwayValue = (medianMaxima + medianMinima) / 2;

    // Filter based on requested extreme type
    if (requestedExtreme === 'maxima') {
        return maximaIndices.filter(i => {
            const value = seriesValueToNumber(series, i);
            return !isNaN(value) && value >= halfwayValue;
        });
    } else {
        return minimaIndices.filter(i => {
            const value = seriesValueToNumber(series, i);
            return !isNaN(value) && value <= halfwayValue;
        });
    }
}

function isExtremeWindow(series: DataSeries, index: number, windowSizeInIndex: number, extreme: 'maxima'|'minima'): boolean {
    const halfWindowSize = Math.floor(windowSizeInIndex / 2);
    const start = Math.max(0, index - halfWindowSize);
    const end = Math.min(series.values.length - 1, index + halfWindowSize);

    const indexVal = seriesValueToNumber(series, index);
    for (let i = start; i <= end; i++) {
        if (i === index) continue; // Skip self-comparison

        const iVal = seriesValueToNumber(series, i);
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

function calculatePeriodRatio(serie: DataSeries, endIndex: number, periodDays: number): number | null {
    const periodIndices = Math.floor(periodDays / serie.frequencyInDays);
    
    // Calculate current period average (last N days)
    const currentStart = Math.max(0, endIndex - periodIndices + 1);
    const currentEnd = endIndex + 1;
    
    // Calculate previous period average (N days before that)
    const previousStart = Math.max(0, currentStart - periodIndices);
    const previousEnd = currentStart;
    
    if (previousStart >= previousEnd || currentStart >= currentEnd) return null;
    
    let currentAvg: number;
    let previousAvg: number;
    
    if ('dataType' in serie && serie.dataType === 'scalar') {
        // For scalar series, calculate average value
        const currentValues = serie.values.slice(currentStart, currentEnd) as ScalarDatapoint[];
        const previousValues = serie.values.slice(previousStart, previousEnd) as ScalarDatapoint[];
        
        if (currentValues.length === 0 || previousValues.length === 0) return null;
        
        const currentSum = currentValues.reduce((sum, val) => sum + val.virusLoad, 0);
        const previousSum = previousValues.reduce((sum, val) => sum + val.virusLoad, 0);
        currentAvg = currentSum / currentValues.length;
        previousAvg = previousSum / previousValues.length;
    } else {
        // For positivity data, calculate percentage
        const currentValues = (serie as PositivitySeries).values.slice(currentStart, currentEnd);
        const previousValues = (serie as PositivitySeries).values.slice(previousStart, previousEnd);
        
        if (currentValues.length === 0 || previousValues.length === 0) return null;
        
        const current = currentValues.reduce((sum, val) => {
            sum.positive += val.positive;
            sum.tests += val.tests;
            return sum;
        }, {positive: 0, tests: 0});
        const previous = previousValues.reduce((sum, val) => {
            sum.positive += val.positive;
            sum.tests += val.tests;
            return sum;
        }, {positive: 0, tests: 0});
        currentAvg = datapointToPercentage(current);
        previousAvg = datapointToPercentage(previous);
    }

    return currentAvg / previousAvg;
}

export function datapointToPercentage(datapoint: Datapoint | undefined): number {
    if (!datapoint || datapoint.tests === 0) return NaN;
    return (datapoint.positive / datapoint.tests) * 100;
}

function seriesValueToNumber(series: DataSeries, index: number): number {
    if ('dataType' in series && series.dataType === 'scalar') {
        return (series.values[index] as ScalarDatapoint)?.virusLoad || NaN;
    } else {
        return datapointToPercentage(series.values[index] as Datapoint);
    }
}

function calculateMedian(values: number[]): number {
    if (values.length === 0) return NaN;
    const sortedValues = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sortedValues.length / 2);
    if (sortedValues.length % 2 === 0) {
        return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
    } else {
        return sortedValues[middle];
    }
}
