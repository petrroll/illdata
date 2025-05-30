import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import euPositivityImport from "../data_processed/eu_sentinel_ervis/positivity_data.json" with { type: "json" };
import lastUpdateTimestamp from "../data_processed/timestamp.json" with { type: "json" };

import { Chart, Legend } from 'chart.js/auto';
import { computeMovingAverageTimeseries, findLocalExtreme, addShiftedToAlignExtremeDates as getNewWithSifterToAlignExtremeDates, calculateRatios, type TimeseriesData, type ExtremeSeries, type RatioData, datapointToPercentage } from "./utils";

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
const SHOW_EXTREMES_KEY = "showExtremes";

interface ChartConfig {
    containerId: string;
    canvasId: string;
    data: TimeseriesData;
    title: string;
    shortTitle: string;
    visibilityKey: string;
    chartHolder: { chart: Chart | undefined };
    datasetVisibility: { [key: string]: boolean };
    canvas?: HTMLCanvasElement | null;
}

// Global chart holders for hideAllSeries
const chartConfigs : ChartConfig[] = [
    {
        containerId: "czechDataContainer",
        canvasId: "czechPositivityChart",
        data: mzcrPositivityEnhanced,
        title: "COVID Test Positivity (MZCR Data)",
        shortTitle: "MZCR",
        visibilityKey: DATASET_VISIBILITY_KEY,
        chartHolder: { chart: undefined as Chart | undefined },
        datasetVisibility: { }
    },
    {
        containerId: "euDataContainer",
        canvasId: "euPositivityChart",
        data: euPositivityEnhanced,
        title: "EU ECDC Respiratory Viruses",
        shortTitle: "ECDC",
        visibilityKey: EU_DATASET_VISIBILITY_KEY,
        chartHolder: { chart: undefined as Chart | undefined },
        datasetVisibility: { }
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
        cfg.canvas = canvas;
    });

    // Unified state
    let currentTimeRange: string;
    let currentIncludeFuture: boolean;
    let currentShowExtremes: boolean = false; // Initialize with default value

    // Unified callback
    function onOptionsChange(newTimeRange?: string, newIncludeFuture?: boolean, newShowExtremes?: boolean) {
        if (typeof newTimeRange !== 'undefined') currentTimeRange = newTimeRange;
        if (typeof newIncludeFuture !== 'undefined') currentIncludeFuture = newIncludeFuture;
        if (typeof newShowExtremes !== 'undefined') currentShowExtremes = newShowExtremes;
        
        console.log(`Options changed: timeRange=${currentTimeRange}, includeFuture=${currentIncludeFuture}, showExtremes=${currentShowExtremes}`);
        
        chartConfigs.forEach(cfg => {
            if ((cfg as any).canvas) {
                cfg.chartHolder.chart = updateChart(
                    currentTimeRange,
                    cfg,
                    currentIncludeFuture,
                    currentShowExtremes
                );
            }
        });
        updateRatioTable(); // Update ratio table on options change
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
        onChange: (val) => onOptionsChange(undefined, val, undefined)
    });

    // Add settings to the footer element
    const footer = document.getElementsByTagName("footer")[0];
    const settingsContainer = document.createElement("div");
    settingsContainer.style.marginTop = "10px";
    settingsContainer.style.display = "flex";
    settingsContainer.style.justifyContent = "center";
    settingsContainer.style.alignItems = "center";
    
    const settingsLabel = document.createElement("span");
    settingsLabel.textContent = "Settings: ";
    settingsLabel.style.marginRight = "10px";
    settingsContainer.appendChild(settingsLabel);
    
    currentShowExtremes = createPreferenceControl<boolean>({
        type: 'checkbox',
        id: 'showExtremesCheckbox',
        label: 'Show Min/Max Series',
        container: settingsContainer,
        localStorageKey: SHOW_EXTREMES_KEY,
        defaultValue: false,
        onChange: (val) => onOptionsChange(undefined, undefined, val)
    });
    
    footer.appendChild(settingsContainer);

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

function updateChart(timeRange: string, cfg: ChartConfig, includeFuture: boolean = true, showExtremes: boolean = false) {
    // Destroy existing chart if it exists
    if (cfg.chartHolder.chart) {
        cfg.chartHolder.chart.destroy();
    }

    let data = cfg.data;
    let cutoffDateString = data.dates[0] ?? new Date().toISOString().split('T')[0];
    if (timeRange !== "all") {
        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDateString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    const localMaximaSeries = data.series
        .filter(series => series.type === 'averaged')
        .filter(series => extremesForWindow == series.windowSizeInDays)
        .map(series => findLocalExtreme(series, extremeWindow, 'maxima'))
    const localMinimaSeries = data.series
        .filter(series => series.type === 'averaged')
        .filter(series => extremesForWindow == series.windowSizeInDays)
        .map(series => findLocalExtreme(series, extremeWindow, 'minima'))
    // Always process extreme dates for shifting, regardless of whether they're shown
    data = getNewWithSifterToAlignExtremeDates(data, localMaximaSeries.flat(), 2, 3, true);
    
    // Only create the datasets for extremes when showExtremes is true
    const localMaximaDatasets = showExtremes ? generateLocalExtremeDataset(localMaximaSeries, data, cutoffDateString, "red", includeFuture) : [];
    const localMinimaDatasets = showExtremes ? generateLocalExtremeDataset(localMinimaSeries, data, cutoffDateString, "blue", includeFuture) : [];

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
        const isVisible = cfg.datasetVisibility[series.name] !== undefined ? cfg.datasetVisibility[series.name] : true;
        const colorPalette = series.name.toLowerCase().includes("pcr") ? colorPalettePCR : colorPaletteNonPCR;

        series.values.forEach((element, i) => {
            if (element === undefined || element === null) {
                console.warn(`Missing value in series ${series.name} at index ${i}`);
            }
            if (element.tests == 0 && element.positive > 0) {
                console.warn(`Invalid data in series ${series.name} at index ${i}: positive tests ${element.positive} without total tests ${data.dates[i]}`);
            }
        });

        return {
            label: series.name,
            data: series.values.slice(startIdx, endIdx).map(datapointToPercentage),
            borderColor: colorPalette[index % colorPalette.length],
            fill: false,
            hidden: !isVisible,
            borderWidth: 1,
            pointRadius: 0,
        };
    });

    datasets.push(...localMaximaDatasets);
    datasets.push(...localMinimaDatasets);

    const validSeriesNames = new Set<string>(datasets.map(ds => ds.label));

    // Retrieve dataset visibility from local storage
    try {
        const storedVisibility = localStorage.getItem(cfg.visibilityKey);
        cfg.datasetVisibility = storedVisibility ? JSON.parse(storedVisibility) : {};
    } catch (error) {
        console.error("Error parsing dataset visibility from local storage:", error);
    }

    validSeriesNames.forEach(seriesName => { cfg.datasetVisibility[seriesName] = cfg.datasetVisibility[seriesName]  ?? true; });
    Object.keys(cfg.datasetVisibility).forEach(seriesName => {
        if (!validSeriesNames.has(seriesName)) {
            console.log(`Removing visibility for non-existing series: ${seriesName}`);
            delete cfg.datasetVisibility[seriesName];
        }
    });
    localStorage.setItem(cfg.visibilityKey, JSON.stringify(cfg.datasetVisibility));

    datasets.forEach(dataset => { dataset.hidden = !cfg.datasetVisibility[dataset.label]; });

    const newChart = new Chart(cfg.canvas as HTMLCanvasElement, {
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
                    text: cfg.title
                },
                legend: {
                    display: false // We'll create a custom HTML legend instead
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

    // Create custom HTML legend with colored background boxes
    createCustomHtmlLegend(newChart, cfg);
    
    return newChart;
}

function createCustomHtmlLegend(chart: Chart, cfg: ChartConfig) {
    // Find or create legend container
    const containerId = cfg.containerId;
    let legendContainer = document.getElementById(`${containerId}-legend`);
    
    if (!legendContainer) {
        legendContainer = document.createElement('div');
        legendContainer.id = `${containerId}-legend`;
        legendContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 10px 0;
            justify-content: center;
        `;
        
        // Insert legend after the chart container
        const chartContainer = document.getElementById(containerId);
        if (chartContainer && chartContainer.parentNode) {
            chartContainer.parentNode.insertBefore(legendContainer, chartContainer.nextSibling);
        }
    }
    
    // Clear existing legend items
    legendContainer.innerHTML = '';
    
    // Create legend items for each dataset
    chart.data.datasets.forEach((dataset, index) => {
        const legendItem = document.createElement('span');
        legendItem.style.cssText = `
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            background-color: ${dataset.borderColor || dataset.backgroundColor || '#666'};
            color: white;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
            opacity: ${dataset.hidden ? '0.5' : '1'};
            text-decoration: ${dataset.hidden ? 'line-through' : 'none'};
            font-family: Arial, sans-serif;
        `;
        legendItem.textContent = dataset.label || `Dataset ${index}`;
        
        // Add click handler for toggling visibility
        legendItem.addEventListener('click', () => {
            const datasetLabel = dataset.label || `Dataset ${index}`;
            const currentlyHidden = !cfg.datasetVisibility[datasetLabel];
            const newVisibility = currentlyHidden;
            
            // Update visibility state first
            cfg.datasetVisibility[datasetLabel] = newVisibility;
            localStorage.setItem(cfg.visibilityKey, JSON.stringify(cfg.datasetVisibility));
            
            // Update chart metadata and dataset
            const meta = chart.getDatasetMeta(index);
            meta.hidden = !newVisibility;
            dataset.hidden = !newVisibility;
            
            // Update chart and legend item opacity
            chart.update();
            legendItem.style.opacity = newVisibility ? '1' : '0.5';
            legendItem.style.textDecoration = newVisibility ? 'none' : 'line-through';
            
            // Update ratio table
            updateRatioTable();
        });
        
        legendContainer.appendChild(legendItem);
    });
}

function generateLocalExtremeDataset(extremeData: ExtremeSeries[][], normalData: TimeseriesData, cutoffDateString: string, color: string, includeFuture: boolean) {
    const todayString = new Date().toISOString().split('T')[0];
    return extremeData.flat().map(extrSeries => {
        return {
            label: extrSeries.name,
            data: extrSeries.indices.map(index => ({
                x: normalData.dates[index],
                y: datapointToPercentage(normalData.series.find(series => series.name === extrSeries.originalSeriesName)?.values[index]) ?? -10
            })).filter(dp => dp.x > cutoffDateString && (includeFuture || dp.x <= todayString)) as any[], // make it any to satisfy types, the typing assumes basic data structure (with labels separately) but the library supports this; it's probably fixable but not worth figuring it out
            borderColor: color,
            backgroundColor: color,
            fill: false,
            hidden: false,
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

function updateRatioTable() { 
    const ratioTableBody = document.getElementById('ratioTableBody');
    const ratioTableHead = document.getElementById('ratioTableHead');
    if (!ratioTableBody || !ratioTableHead) {
        console.error('ratioTableBody or ratioTableHead not found');
        return;
    }
    
    // Clear existing table content
    ratioTableBody.innerHTML = '';
    
    // Collect all visible main series (non-averaged, non-extreme series)
    const visiblePerChart: [ChartConfig, string[]][] = [];
    
    chartConfigs.forEach((cfg, index) => {
        const chart = cfg.chartHolder.chart;
        if (!chart) {
            console.error(`Chart ${index} not found`);
            return;
        }

        const visibleInThisChart = cfg.data.series.filter(series => {
            if (series.type !== 'raw') return false;
            
            // Check if any key in datasetVisibility contains this series name and has a true value
            return Object.entries(cfg.datasetVisibility).some(([key, isVisible]) => {
                console.log(`Checking visibility for ${series.name} in ${key}: ${isVisible}`);
                return key.includes(series.name) && isVisible;
            });
        }).map(series => series.name);

        visiblePerChart.push([cfg, visibleInThisChart]);
    });
    
    if (visiblePerChart.length === 0) {
        console.error('No visible main series found');
        ratioTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 8px; border: 1px solid #ddd;">No main series visible</td></tr>';
        return;
    }
    
    // Calculate ratios for all datasets
    const allRatios: RatioData[] = [];
    visiblePerChart.forEach(([cfg, seriesNames]) => {
        const ratios = calculateRatios(cfg.data, seriesNames);
        ratios.forEach(ratio => {
            const daysSinceLastData = (new Date().getTime() - (ratio.lastDataDate ?? new Date()).getTime()) / (1000 * 60 * 60 * 24);
            ratio.seriesName =  `${ratio.seriesName} - ${cfg.shortTitle} (last: -${Math.ceil(daysSinceLastData)}d)`; 
        });
        allRatios.push(...ratios);
    });
    
    // Build the header row with series names
    const headerRow = ratioTableHead.querySelector('tr');
    if (headerRow) {
        // Clear existing headers except the first one
        while (headerRow.children.length > 1) {
            headerRow.removeChild(headerRow.lastChild!);
        }
        
        // Add column headers for each series
        allRatios.forEach(ratio => {
            const th = document.createElement('th');
            th.style.border = '1px solid #ddd';
            th.style.padding = '8px';
            th.style.textAlign = 'center';
            th.style.fontSize = '0.85em';
            th.innerHTML = ratio.seriesName;
            headerRow.appendChild(th);
        });
    }
    
    // Create rows for 7-day and 28-day trends
    const trendPeriods = [
        { label: '7d trend<br><small>(vs prior)</small>', getValue: (ratio: RatioData) => ratio.ratio7days },
        { label: '28d trend<br><small>(vs prior)</small>', getValue: (ratio: RatioData) => ratio.ratio28days }
    ];
    
    trendPeriods.forEach(period => {
        const row = document.createElement('tr');
        
        // First cell: trend period label
        const labelCell = document.createElement('td');
        labelCell.style.border = '1px solid #ddd';
        labelCell.style.padding = '8px';
        labelCell.style.backgroundColor = '#f5f5f5';
        labelCell.style.fontWeight = 'bold';
        labelCell.innerHTML = period.label;
        row.appendChild(labelCell);
        
        // Data cells for each series
        allRatios.forEach(ratio => {
            const cell = document.createElement('td');
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '8px';
            cell.style.textAlign = 'center';
            
            const value = period.getValue(ratio);
            cell.textContent = value !== null ? value.toFixed(2) + 'x' : 'N/A';
            
            // Add color coding based on ratio values
            if (value !== null) {
                if (value > 1.1) {
                    cell.style.backgroundColor = '#ffebee'; // Light red for increasing
                    cell.style.color = '#c62828';
                } else if (value < 0.9) {
                    cell.style.backgroundColor = '#e8f5e8'; // Light green for decreasing
                    cell.style.color = '#2e7d32';
                }
            }
            
            row.appendChild(cell);
        });
        
        ratioTableBody.appendChild(row);
    });
}
