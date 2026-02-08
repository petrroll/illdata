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
    country?: string; // Optional country field for EU data
    survtype?: string; // Optional surveillance type field for EU ERVIS data (sentinel/non-sentinel)
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

/**
 * Type guard to check if a DataSeries is a ScalarSeries.
 * Replaces the repeated pattern `'dataType' in series && series.dataType === 'scalar'`
 * @param series - The data series to check
 * @returns True if the series is a scalar series, false otherwise
 */
export function isScalarSeries(series: DataSeries): series is ScalarSeries {
    return series.dataType === 'scalar';
}

interface ShiftedSeriesOptions {
    name: string;
    shiftByIndexes: number;
    length: number;
    includeCountry?: boolean;
}

const SCALAR_PLACEHOLDER = (): ScalarDatapoint => ({ virusLoad: 0 });
const POSITIVITY_PLACEHOLDER = (): Datapoint => ({ positive: 0, tests: NaN });

function buildShiftedValues<T>(values: T[], length: number, shiftByIndexes: number, placeholderFactory: () => T): T[] {
    return Array.from({ length }, (_, i) => {
        const idx = i + shiftByIndexes;
        return idx < 0 || idx >= values.length ? placeholderFactory() : values[idx];
    });
}

function createShiftedSeries(series: DataSeries, options: ShiftedSeriesOptions): DataSeries {
    const { name, shiftByIndexes, length, includeCountry = false } = options;

    const commonSeriesProps = {
        name,
        type: series.type,
        shiftedByIndexes: shiftByIndexes,
        frequencyInDays: series.frequencyInDays,
        ...(series.windowSizeInDays ? { windowSizeInDays: series.windowSizeInDays } : {}),
        ...(includeCountry && series.country ? { country: series.country } : {}),
        ...(series.survtype ? { survtype: series.survtype } : {})
    } as const;

    if (isScalarSeries(series)) {
        const shiftedValues = buildShiftedValues<ScalarDatapoint>(
            series.values,
            length,
            shiftByIndexes,
            SCALAR_PLACEHOLDER
        );
        return {
            ...commonSeriesProps,
            values: shiftedValues,
            dataType: 'scalar' as const
        } as ScalarSeries;
    }

    const shiftedValues = buildShiftedValues<Datapoint>(
        series.values,
        length,
        shiftByIndexes,
        POSITIVITY_PLACEHOLDER
    );
    return {
        ...commonSeriesProps,
        values: shiftedValues,
        dataType: 'positivity' as const
    } as PositivitySeries;
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

function buildBaseSeries(series: DataSeries, padding: number): DataSeries {
    if (padding <= 0) {
        return series;
    }
    
    // Use proper placeholder objects based on series type
    const paddingValues = isScalarSeries(series)
        ? Array.from({ length: padding }, () => SCALAR_PLACEHOLDER())
        : Array.from({ length: padding }, () => POSITIVITY_PLACEHOLDER());
    const paddedValues = [...series.values, ...paddingValues];
    
    return { ...series, values: paddedValues } as DataSeries;
}

export function getNewWithCustomShift(
    data: TimeseriesData,
    shiftDays: number,
    includeFutureDates: boolean = false
): TimeseriesData {
    const freqDays = data.series[0]?.frequencyInDays ?? 1;
    const extraCount = includeFutureDates && shiftDays < 0 ? Math.abs(shiftDays) / freqDays : 0;
    const newDates = includeFutureDates ? extendDatesIfNeeded(data.dates, Math.ceil(extraCount), freqDays) : data.dates;

    function buildShiftedSeriesCustom(series: DataSeries): DataSeries[] {
        const shiftByIndexes = Math.round(shiftDays / series.frequencyInDays);
        const extraLength = includeFutureDates ? Math.ceil(extraCount) : 0;
        const length = series.values.length + extraLength;

        const shiftedSeries = createShiftedSeries(series, {
            name: `${series.name} shifted by ${shiftDays}d`,
            shiftByIndexes,
            length
        });

        const base = buildBaseSeries(series, extraLength);

        return [shiftedSeries, base];
    }

    const shiftedSeries = data.series.flatMap(buildShiftedSeriesCustom);
    return { dates: newDates, series: shiftedSeries };
}

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

    // Helper function to find extremes that match a series by base name
    function findMatchingExtremes(series: DataSeries): ExtremeSeries[] {
        const seriesBaseName = getColorBaseSeriesName(series.name);
        return extremeSeries.filter(extreme => {
            const extremeBaseName = getColorBaseSeriesName(extreme.originalSeriesName);
            return extremeBaseName === seriesBaseName;
        });
    }

    // Calculate all shifts and how many extra dates are needed
    const allShifts = data.series.flatMap(series =>
        findMatchingExtremes(series).map(getShift)
    );
    const negativeShifts = allShifts.filter(s => s < 0);
    const extraCount = includeFutureDates && negativeShifts.length > 0
        ? Math.max(...negativeShifts.map(s => -s))
        : 0;

    const freqDays = data.series[0]?.frequencyInDays ?? 1;
    const newDates = includeFutureDates ? extendDatesIfNeeded(data.dates, extraCount, freqDays) : data.dates;

    function buildShiftedSeries(series: DataSeries): DataSeries[] {
        const matchingExtremes = findMatchingExtremes(series);
        const shifts = matchingExtremes.map(extreme => {
            const shiftByIndexes = getShift(extreme);
            const extraLength = includeFutureDates ? extraCount : 0;
            const length = series.values.length + extraLength;

            return createShiftedSeries(series, {
                name: `${series.name} shifted by ${extremeIndexShiftTo - extremeIndexShiftFrom} wave ${shiftByIndexes * series.frequencyInDays}d`,
                shiftByIndexes,
                length,
                includeCountry: true
            });
        });
        const base = buildBaseSeries(series, includeFutureDates ? extraCount : 0);
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
        
        if (isScalarSeries(series)) {
            // Handle scalar data (e.g., wastewater virus load)
            return adjustedWindowSizes.map((windowSizeInIndex, i) => {
                const averagedValues = series.values.map((v, j) => {
                    let sumLoad = 0;
                    let count = 0;
                    for (let k = -Math.floor(windowSizeInIndex/2); k <= Math.floor(windowSizeInIndex/2); k++) {
                        let index = j + k;
                        if (index < 0) continue;
                        if (index >= series.values.length) continue;
                        
                        const value = series.values[index].virusLoad;
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
                    dataType: 'scalar',
                    ...(series.country ? { country: series.country } : {}),
                    ...(series.survtype ? { survtype: series.survtype } : {})
                } as ScalarSeries;
            });
        }
        
        // Handle positivity data
        return adjustedWindowSizes.map((windowSizeInIndex, i) => {
            const averagedValues = series.values.map((v, j) => {
                let sumPos = 0;
                let sumTotal = 0;
                for (let k = -Math.floor(windowSizeInIndex/2); k <= Math.floor(windowSizeInIndex/2); k++) {
                    let index = j + k;
                    if (index < 0) continue;
                    if (index >= series.values.length) continue;
                    
                    sumPos += series.values[index].positive;
                    sumTotal += series.values[index].tests;
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
                dataType: 'positivity',
                ...(series.country ? { country: series.country } : {}),
                ...(series.survtype ? { survtype: series.survtype } : {})
            } as PositivitySeries;
        });
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

function calculatePeriodRatio(series: DataSeries, endIndex: number, periodDays: number): number | null {
    const periodIndices = Math.floor(periodDays / series.frequencyInDays);
    
    // Calculate current period average (last N days)
    const currentStart = Math.max(0, endIndex - periodIndices + 1);
    const currentEnd = endIndex + 1;
    
    // Calculate previous period average (N days before that)
    const previousStart = Math.max(0, currentStart - periodIndices);
    const previousEnd = currentStart;
    
    if (previousStart >= previousEnd || currentStart >= currentEnd) return null;
    
    let currentAvg: number;
    let previousAvg: number;
    
    if (isScalarSeries(series)) {
        // For scalar series, calculate average value
        const currentValues = series.values.slice(currentStart, currentEnd);
        const previousValues = series.values.slice(previousStart, previousEnd);
        
        if (currentValues.length === 0 || previousValues.length === 0) return null;
        
        const currentSum = currentValues.reduce((sum, val) => sum + val.virusLoad, 0);
        const previousSum = previousValues.reduce((sum, val) => sum + val.virusLoad, 0);
        currentAvg = currentSum / currentValues.length;
        previousAvg = previousSum / previousValues.length;
    } else {
        // For positivity data, calculate percentage
        const currentValues = series.values.slice(currentStart, currentEnd);
        const previousValues = series.values.slice(previousStart, previousEnd);
        
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
    if (isScalarSeries(series)) {
        return series.values[index]?.virusLoad || NaN;
    }
    return datapointToPercentage(series.values[index]);
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

/**
 * Compares two labels by word count first (fewer words first), then alphabetically.
 * Used for consistent sorting of series labels in charts and legends.
 * 
 * @param labelA - First label to compare
 * @param labelB - Second label to compare
 * @returns Negative if labelA comes first, positive if labelB comes first, 0 if equal
 */
export function compareLabels(labelA: string, labelB: string): number {
    // Count words (sections separated by whitespace)
    const wordsA = labelA.trim().split(/\s+/).filter(word => word.length > 0).length;
    const wordsB = labelB.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Sort by word count first
    if (wordsA !== wordsB) {
        return wordsA - wordsB; // fewer words first
    }
    
    // If word count is the same, fall back to alphabetical
    return labelA.localeCompare(labelB);
}

/**
 * Extracts the truly base series name for color assignment purposes.
 * Strips both shift information and averaging window information to get the raw series name.
 * This ensures consistent colors across all variations (raw, averaged, shifted) of the same series.
 * 
 * Examples:
 * - "PCR Positivity" -> "PCR Positivity"
 * - "PCR Positivity (28d avg)" -> "PCR Positivity"
 * - "PCR Positivity (28d avg) shifted by 1 wave -347d" -> "PCR Positivity"
 * - "Antigen Positivity (28d avg) shifted by -300d" -> "Antigen Positivity"
 * - "Influenza Positivity - Positive Tests" -> "Influenza Positivity - Positive Tests"
 * 
 * @param label - The full series label
 * @returns The base series name without shift or averaging information
 */
export function getColorBaseSeriesName(label: string): string {
    let baseName = label;
    
    // Remove shift information (both wave-based and custom)
    baseName = baseName
        .replace(/ shifted by \d+ waves? -?\d+d/, '')
        .replace(/ shifted by -?\d+d/, '');
    
    // Remove averaging window information like "(28d avg)"
    baseName = baseName.replace(/\s*\(\d+d avg\)/, '');
    
    // Remove extreme indicators like "maxima over 84d" or "minima over 84d"
    baseName = baseName.replace(/\s+(maxima|minima)\s+over\s+\d+d/, '');
    
    // Remove surveillance type suffixes like "(Sentinel)" and "(Non-Sentinel)"
    baseName = baseName.replace(/\s*\((Non-)?Sentinel\)/, '');
    
    return baseName.trim();
}
