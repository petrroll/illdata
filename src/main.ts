import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import euPositivityImport from "../data_processed/eu_sentinel_ervis/positivity_data.json" with { type: "json" };
import lastUpdateTimestamp from "../data_processed/timestamp.json" with { type: "json" };

import { Chart, Legend } from 'chart.js/auto';
import { computeMovingAverageTimeseries, findLocalExtreme, addShiftedToAlignExtremeDates, type TimeseriesData, type ExtremeSeries } from "./utils";

const mzcrPositivity = mzcrPositivityImport as TimeseriesData;
const euPositivity = euPositivityImport as TimeseriesData;
const averagingWindows = [28];
const extremesForWindow = 28;
const extremeWindow = 3*28;
const mzcrPositivityEnhanced = computeMovingAverageTimeseries(mzcrPositivity, averagingWindows);
const euPositivityEnhanced = computeMovingAverageTimeseries(euPositivity, averagingWindows);

// Local storage keys
const TIME_RANGE_KEY = "selectedTimeRange";
const DATASET_VISIBILITY_KEY = "datasetVisibility";
const EU_DATASET_VISIBILITY_KEY = "euDatasetVisibility";
const INCLUDE_FUTURE_KEY = "includeFuture";

// Global chart holders for hideAllSeries
const chartConfigs = [
    {
        containerId: "czechDataContainer",
        canvasId: "czechPositivityChart",
        data: mzcrPositivityEnhanced,
        title: "COVID Test Positivity (MZCR Data)",
        visibilityKey: DATASET_VISIBILITY_KEY,
        chartHolder: { chart: undefined as Chart | undefined },
    },
    {
        containerId: "euDataContainer",
        canvasId: "euPositivityChart",
        data: euPositivityEnhanced,
        title: "EU ECDC Respiratory Viruses",
        visibilityKey: EU_DATASET_VISIBILITY_KEY,
        chartHolder: { chart: undefined as Chart | undefined },
    }
];

const container = document.getElementById("root");
renderPage(container);

// Generic function to create a control, initialize from localStorage, and handle change
function createPreferenceControl<T extends string | boolean>(options: {
    type: 'select' | 'checkbox',
    id: string,
    label?: string,
    container: HTMLElement,
    localStorageKey: string,
    values?: { value: string, label: string }[], // for select
    defaultValue: T,
    onChange: (value: T) => void
}) {
    let control: HTMLSelectElement | HTMLInputElement;
    let value: T = options.defaultValue;
    if (options.type === 'select') {
        control = document.createElement('select');
        control.id = options.id;
        (options.values || []).forEach(opt => {
            const optionElement = document.createElement('option');
            optionElement.value = opt.value;
            optionElement.textContent = opt.label;
            control.appendChild(optionElement);
        });
        const stored = localStorage.getItem(options.localStorageKey);
        value = (stored as T) || options.defaultValue;
        (control as HTMLSelectElement).value = value as string;
    } else {
        control = document.createElement('input');
        control.type = 'checkbox';
        control.id = options.id;
        const stored = localStorage.getItem(options.localStorageKey);
        value = stored !== null ? JSON.parse(stored) : options.defaultValue;
        (control as HTMLInputElement).checked = value as boolean;
    }
    if (options.label) {
        const label = document.createElement('label');
        label.htmlFor = options.id;
        label.textContent = options.label;
        options.container.appendChild(label);
    }
    options.container.appendChild(control);
    control.addEventListener('change', (event) => {
        let newValue: T;
        if (options.type === 'select') {
            newValue = (event.target as HTMLSelectElement).value as T;
        } else {
            newValue = (event.target as HTMLInputElement).checked as T;
        }
        localStorage.setItem(options.localStorageKey, typeof newValue === 'string' ? newValue : JSON.stringify(newValue));
        options.onChange(newValue);
    });
    return value;
}

// Refactored renderPage to use unified control creation and callback
function renderPage(rootDiv: HTMLElement | null) {
    if (!rootDiv) {
        console.error("Root element not found.");
        return;
    }

    // Update last update timestamp
    const lastUpdateSpan = document.getElementById("lastUpdateTime");
    if (lastUpdateSpan) {
        const date = new Date(lastUpdateTimestamp.timestamp);
        lastUpdateSpan.textContent = date.toISOString();
    } else {
        console.error("Last update span not found");
    }

    // Prepare chart canvases and holders
    chartConfigs.forEach(cfg => {
        const canvas = createChartContainerAndCanvas(cfg.containerId, cfg.canvasId);
        (cfg as any).canvas = canvas;
    });

    // Unified state
    let currentTimeRange: string;
    let currentIncludeFuture: boolean;

    // Unified callback
    function onOptionsChange(newTimeRange?: string, newIncludeFuture?: boolean) {
        if (typeof newTimeRange !== 'undefined') currentTimeRange = newTimeRange;
        if (typeof newIncludeFuture !== 'undefined') currentIncludeFuture = newIncludeFuture;
        chartConfigs.forEach(cfg => {
            if ((cfg as any).canvas) {
                cfg.chartHolder.chart = updateChart(
                    currentTimeRange,
                    cfg.data,
                    (cfg as any).canvas,
                    cfg.chartHolder.chart,
                    cfg.title,
                    cfg.visibilityKey,
                    currentIncludeFuture
                );
            }
        });
    }

    // Controls
    currentTimeRange = createPreferenceControl<string>({
        type: 'select',
        id: 'timeRangeSelect',
        label: undefined,
        container: rootDiv,
        localStorageKey: TIME_RANGE_KEY,
        values: [
            { value: "30", label: "Last Month" },
            { value: "90", label: "Last 90 Days" },
            { value: "365", label: "Last Year" },
            { value: `${365*2}`, label: "Last 2 Years" },
            { value: "all", label: "All Time" },
        ],
        defaultValue: "all",
        onChange: (val) => onOptionsChange(val, undefined)
    });

    currentIncludeFuture = createPreferenceControl<boolean>({
        type: 'checkbox',
        id: 'includeFutureCheckbox',
        label: 'Include Future Data',
        container: rootDiv,
        localStorageKey: INCLUDE_FUTURE_KEY,
        defaultValue: true,
        onChange: (val) => onOptionsChange(undefined, val)
    });

    // Initial render
    onOptionsChange();

    // Attach event listener to hide all button
    const hideAllButton = document.getElementById('hideAllButton');
    if (hideAllButton) {
        hideAllButton.addEventListener('click', () => hideAllSeries(onOptionsChange));
    }
}

function createChartContainerAndCanvas(containerId: string, canvasId: string): HTMLCanvasElement | null {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container not found: ${containerId}`);
        return null;
    }
    container.style.width = "100vw";
    container.style.height = "40vh";
    let canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = canvasId;
        container.appendChild(canvas);
    }
    return canvas;
}

function updateChart(timeRange: string, data: TimeseriesData, canvas: HTMLCanvasElement, previousChartInstance?: Chart, title?: string, visibilityKey: string = DATASET_VISIBILITY_KEY, includeFuture: boolean = true) {
    // Destroy existing chart if it exists
    if (previousChartInstance) {
        previousChartInstance.destroy();
    }

    let cutoffDateString = data.dates[0] ?? new Date().toISOString().split('T')[0];
    if (timeRange !== "all") {
        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDateString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Retrieve dataset visibility from local storage
    let datasetVisibility: { [key: string]: boolean } = {};
    try {
        const storedVisibility = localStorage.getItem(visibilityKey);
        datasetVisibility = storedVisibility ? JSON.parse(storedVisibility) : {};
        
        // Get all extreme series that will be in the chart
        const localMaximaSeries = data.series
            .filter(series => series.type === 'averaged')
            .filter(series => extremesForWindow == series.windowSizeInDays)
            .map(series => findLocalExtreme(series, extremeWindow, 'maxima'));
        const localMinimaSeries = data.series
            .filter(series => series.type === 'averaged')
            .filter(series => extremesForWindow == series.windowSizeInDays)
            .map(series => findLocalExtreme(series, extremeWindow, 'minima'));
        
        // Create a set of all valid series names (normal series + extreme series)
        const validSeriesNames = new Set<string>();
        data.series.forEach(series => validSeriesNames.add(series.name));
        localMaximaSeries.flat().forEach(series => validSeriesNames.add(series.name));
        localMinimaSeries.flat().forEach(series => validSeriesNames.add(series.name));
        
        // Filter out entries that don't correspond to any series
        const filteredDatasetVisibility: { [key: string]: boolean } = {};
        Object.keys(datasetVisibility).forEach(seriesName => {
            if (validSeriesNames.has(seriesName)) {
                filteredDatasetVisibility[seriesName] = datasetVisibility[seriesName];
            }
        });
        
        // Update datasetVisibility with filtered version
        datasetVisibility = filteredDatasetVisibility;
        
        // Save filtered version back to localStorage
        localStorage.setItem(visibilityKey, JSON.stringify(datasetVisibility));
    } catch (error) {
        console.error("Error parsing dataset visibility from local storage:", error);
    }

    const localMaximaDatasets = generateLocalExtremeDataset(localMaximaSeries, data, datasetVisibility, cutoffDateString, "red", includeFuture);
    const localMinimaDatasets = generateLocalExtremeDataset(localMinimaSeries, data, datasetVisibility, cutoffDateString, "blue", includeFuture);
    data = addShiftedToAlignExtremeDates(data, localMaximaSeries.flat(), 1, 2, true);

    // End cutoff based on future inclusion flag
    const todayString = new Date().toISOString().split('T')[0];
    let startIdx = data.dates.findIndex(d => d > cutoffDateString);
    if (startIdx < 0) startIdx = 0;
    let endIdx = data.dates.length;
    if (!includeFuture) {
        const futureIdx = data.dates.findIndex(d => d > todayString);
        if (futureIdx >= 0) endIdx = futureIdx;
    }
    const labels = data.dates.slice(startIdx, endIdx);

    // Prepare data for chart
    const colorPalettePCR = [
        "#1f77b4", "#aec7e8", "#ffbb78", "#2ca02c", "#98df8a", 
        "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b"
    ];
    const colorPaletteNonPCR = [
        "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", 
        "#dbdb8d", "#17becf", "#9edae5", "#ff7f0e", "#ffbb78"
    ];
    const datasets = data.series.map((series, index) => {
        const isVisible = datasetVisibility[series.name] !== undefined ? datasetVisibility[series.name] : true;
        const colorPalette = series.name.toLowerCase().includes("pcr") ? colorPalettePCR : colorPaletteNonPCR;
        return {
            label: series.name,
            data: series.values.slice(startIdx, endIdx),
            borderColor: colorPalette[index % colorPalette.length],
            fill: false,
            hidden: !isVisible,
            borderWidth: 1,
            pointRadius: 0,
        };
    });

    datasets.push(...localMaximaDatasets);
    datasets.push(...localMinimaDatasets);

    return new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index', // Snap to nearest x value (vertical line)
                intersect: false,
                axis: 'x', // Only vertical
            },
            plugins: {
                title: {
                    display: true,
                    text: title || "Positivity Data"
                },
                legend: {
                    onClick: (evt, item, legend) => {
                        Legend.defaults!.onClick(evt, item, legend)

                        // Store the new visibility state
                        datasetVisibility[item.text] = !item.hidden;
                        localStorage.setItem(visibilityKey, JSON.stringify(datasetVisibility));
                    }
                },
                tooltip: {
                    mode: 'index', // Snap tooltip to vertical line
                    intersect: false,
                    axis: 'x',
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: function(context) {
                            let label = context.tick.label;
                            if (Array.isArray(label)) {
                                label = label[0];
                            }
                            const date = new Date(label || '');
                            return date > new Date() ? 'gray' : 'black';
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(tickValue: string | number) {
                            if (typeof tickValue === 'number') {
                                return tickValue.toFixed(2) + "%";
                            }
                            return tickValue;
                        }
                    }
                }
            }
        }
    });
}

function generateLocalExtremeDataset(extremeData: ExtremeSeries[][], normalData: TimeseriesData, datasetVisibility: { [key: string]: boolean; }, cutoffDateString: string, color: string, includeFuture: boolean) {
    const todayString = new Date().toISOString().split('T')[0];
    return extremeData.flat().map(extrSeries => {
        const isVisible = datasetVisibility[extrSeries.name] !== undefined ? datasetVisibility[extrSeries.name] : true;
        return {
            label: extrSeries.name,
            data: extrSeries.indices.map(index => ({
                x: normalData.dates[index],
                y: normalData.series.find(series => series.name === extrSeries.originalSeriesName)?.values[index] ?? -10
            })).filter(dp => dp.x > cutoffDateString && (includeFuture || dp.x <= todayString)) as any[], // make it any to satisfy types, the typing assumes basic data structure (with labels separately) but the library supports this; it's probably fixable but not worth figuring it out
            borderColor: color,
            backgroundColor: color,
            fill: false,
            hidden: !isVisible,
            borderWidth: 1,
            pointRadius: 5,
            type: "scatter",
            showLine: false
        };
    });
}

function hideAllSeries(onOptionsChange: () => void) {
    chartConfigs.forEach(cfg => {
        const chart = cfg.chartHolder.chart;
        if (chart) {
            const visibilityMap: { [name: string]: boolean } = {};
            chart.data.datasets.forEach((dataset: any) => {
                if (dataset.label) {
                    visibilityMap[dataset.label] = false;
                }
                dataset.hidden = true;
            });
            localStorage.setItem(cfg.visibilityKey, JSON.stringify(visibilityMap));
            onOptionsChange();
        }
    });
}
