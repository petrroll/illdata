/**
 * Pure, testable logic for assembling custom graph data from multiple source charts.
 * 
 * Extracted from main.ts to enable unit testing of the data assembly, 
 * country/survtype filtering, interpolation, and deduplication logic.
 */

import { normalizeSeriesName } from "./locales";
import { isShiftedSeries } from "./series-utils";
import { isScalarSeries, type TimeseriesData, type DataSeries, type PositivitySeries, type ScalarSeries, type Datapoint, type ScalarDatapoint } from "./utils";

export interface CustomGraphSelection {
    sourceChartIndex: number;
    seriesName: string; // Normalized (English) series name
}

/** Minimal representation of a source chart for custom graph assembly */
export interface SourceChartInfo {
    data: TimeseriesData;
    shortTitle: string;
    isCustomGraph?: boolean;
    countryFilter?: string;     // Currently selected country (undefined = no filter)
    survtypeFilter?: string;    // Currently selected survtype ("both" = no filter)
}

/**
 * Assembles custom graph data from selected series across multiple source charts.
 * 
 * This is a pure function — all external state (filters, chart configs) is passed
 * explicitly as parameters to enable testing.
 */
export function assembleCustomGraphData(
    selections: CustomGraphSelection[],
    sourceCharts: SourceChartInfo[],
    showShifted: boolean
): TimeseriesData {
    if (selections.length === 0) {
        return { dates: [], series: [] };
    }
    
    const allDatesSet = new Set<string>();
    const seriesWithMeta: Array<{
        series: DataSeries;
        sourceData: TimeseriesData;
        newName: string;
    }> = [];
    const processedCharts = new Set<number>();
    const seenSeriesKeys = new Set<string>();
    
    selections.forEach(selection => {
        const sourceChart = sourceCharts[selection.sourceChartIndex];
        if (!sourceChart || sourceChart.isCustomGraph) return;
        
        const sourceData = sourceChart.data;
        const normalizedSeriesName = selection.seriesName;
        
        // Apply country filter from source chart
        let sourceSeries = sourceData.series;
        if (sourceChart.countryFilter) {
            sourceSeries = sourceSeries.filter(s => !s.country || s.country === sourceChart.countryFilter);
        }
        
        // Apply survtype filter from source chart
        if (sourceChart.survtypeFilter && sourceChart.survtypeFilter !== "both") {
            sourceSeries = sourceSeries.filter(s => !s.survtype || s.survtype === sourceChart.survtypeFilter);
        }
        
        // Find the series by normalized name
        const series = sourceSeries.find(s => normalizeSeriesName(s.name) === normalizedSeriesName);
        if (!series) return;
        
        // Skip shifted series if disabled
        if (!showShifted && isShiftedSeries(series.name)) return;
        
        // Skip scalar/wastewater series (no dual y-axis support yet)
        if (series.dataType !== 'positivity') return;
        
        // Deduplication
        const seriesKey = `${selection.sourceChartIndex}:${series.name}`;
        if (seenSeriesKeys.has(seriesKey)) return;
        seenSeriesKeys.add(seriesKey);
        
        // Collect dates from each source chart once
        if (!processedCharts.has(selection.sourceChartIndex)) {
            sourceData.dates.forEach(date => allDatesSet.add(date));
            processedCharts.add(selection.sourceChartIndex);
        }
        
        // Build suffix for display name
        let suffix = sourceChart.shortTitle;
        if (sourceChart.countryFilter && sourceChart.countryFilter !== "EU/EEA") {
            suffix = `${suffix} - ${sourceChart.countryFilter}`;
        }
        
        seriesWithMeta.push({
            series,
            sourceData,
            newName: `${series.name} (${suffix})`
        });
    });
    
    const allDates = Array.from(allDatesSet).sort();
    
    const allSeries: DataSeries[] = seriesWithMeta.map(({ series, sourceData, newName }) => {
        const dateToIndexMap = new Map<string, number>();
        sourceData.dates.forEach((date, idx) => {
            dateToIndexMap.set(date, idx);
        });
        
        const alignedValues = allDates.map((date, idx) => {
            const sourceIndex = dateToIndexMap.get(date);
            if (sourceIndex !== undefined && sourceIndex < series.values.length) {
                return series.values[sourceIndex];
            }
            
            // Interpolate
            let prevIdx = idx - 1;
            let nextIdx = idx + 1;
            
            while (prevIdx >= 0 && !dateToIndexMap.has(allDates[prevIdx])) {
                prevIdx--;
            }
            while (nextIdx < allDates.length && !dateToIndexMap.has(allDates[nextIdx])) {
                nextIdx++;
            }
            
            if (prevIdx >= 0 && nextIdx < allDates.length) {
                const prevSourceIdx = dateToIndexMap.get(allDates[prevIdx])!;
                const nextSourceIdx = dateToIndexMap.get(allDates[nextIdx])!;
                const prevValue = series.values[prevSourceIdx];
                const nextValue = series.values[nextSourceIdx];
                
                if (prevValue && nextValue) {
                    const ratio = (idx - prevIdx) / (nextIdx - prevIdx);
                    
                    if (isScalarSeries(series)) {
                        const prevScalar = prevValue as ScalarDatapoint;
                        const nextScalar = nextValue as ScalarDatapoint;
                        return {
                            virusLoad: prevScalar.virusLoad + (nextScalar.virusLoad - prevScalar.virusLoad) * ratio
                        } as ScalarDatapoint;
                    } else {
                        const prevPositivity = prevValue as Datapoint;
                        const nextPositivity = nextValue as Datapoint;
                        return {
                            positive: prevPositivity.positive + (nextPositivity.positive - prevPositivity.positive) * ratio,
                            tests: prevPositivity.tests + (nextPositivity.tests - prevPositivity.tests) * ratio
                        } as Datapoint;
                    }
                }
            }
            
            return null;
        });
        
        if (isScalarSeries(series)) {
            return {
                ...series,
                name: newName,
                values: alignedValues as ScalarDatapoint[]
            } as ScalarSeries;
        } else {
            return {
                ...series,
                name: newName,
                values: alignedValues as Datapoint[]
            } as PositivitySeries;
        }
    });
    
    return {
        dates: allDates,
        series: allSeries
    };
}
