import { type DataView, type SmoothingWindow, DATA_VIEWS, SMOOTHING_WINDOWS } from './settings';
import { computeMovingAverageTimeseries, computeRatioTimeseries, type TimeseriesData, type DataSeries } from './utils';

/** Strip only the built-in ratio decoration, retaining smoothing and shift identity. */
export function stripRatioLabel(name: string): string {
    return name.replace(/ - (7|28)d Ratio/, '');
}

export function variantKey(name: string): string {
    const ratio = name.match(/ - (7|28)d Ratio/);
    const smoothing = name.match(/\((7|28)d avg\)/);
    return `${ratio ? `ratio${ratio[1]}` : 'raw'}:${smoothing?.[1] ?? 'none'}`;
}

export function seriesSmoothing(series: DataSeries): SmoothingWindow {
    return series.type === 'raw' ? 'none' : String(series.windowSizeInDays) as SmoothingWindow;
}

/** Build each selected pair once, always deriving ratios from the underlying raw observations. */
export function assembleChartVariants(
    source: TimeseriesData, dataViews: DataView[], smoothingWindows: SmoothingWindow[]
): TimeseriesData {
    const raw = { ...source, series: source.series.filter(series => series.type === 'raw') };
    const windows = SMOOTHING_WINDOWS.filter(window => smoothingWindows.includes(window));
    const missingWindows = windows.filter(window => window !== 'none'
        && raw.series.some(series => !source.series.some(candidate =>
            candidate.name === `${series.name} (${window}d avg)`
            && candidate.country === series.country && candidate.survtype === series.survtype
            && candidate.ageGroup === series.ageGroup)));
    const computed = computeMovingAverageTimeseries(raw, missingWindows.map(Number));
    const available = [...source.series, ...computed.series];
    const seen = new Set<string>();
    const series = available.filter(series => {
        const key = JSON.stringify([series.name, series.country, series.survtype, series.ageGroup]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    const prepared = { ...source, series };
    return {
        dates: source.dates,
        series: DATA_VIEWS.filter(view => dataViews.includes(view)).flatMap(view => {
            const transformed = view === 'raw' ? prepared
                : computeRatioTimeseries(prepared, view === 'ratio7' ? 7 : 28);
            return transformed.series.filter(series => windows.includes(seriesSmoothing(series)))
                .map(series => view === 'raw' ? series : {
                    ...series, name: `${series.name} - ${view === 'ratio7' ? 7 : 28}d Ratio`
                });
        })
    };
}
