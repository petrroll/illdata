import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import euPositivityImport from "../data_processed/eu_sentinel_ervis/positivity_data.json" with { type: "json" };
import deWastewaterImport from "../data_processed/de_wastewater_amelag/wastewater_data.json" with { type: "json" };
import lastUpdateTimestamp from "../data_processed/timestamp.json" with { type: "json" };

import { Chart, Legend } from 'chart.js/auto';
import { computeMovingAverageTimeseries, findLocalExtreme, filterExtremesByMedianThreshold, getNewWithSifterToAlignExtremeDates, calculateRatios, type TimeseriesData, type ExtremeSeries, type RatioData, type LinearSeries, datapointToPercentage } from "./utils";

const mzcrPositivity = mzcrPositivityImport as TimeseriesData;
const euPositivity = euPositivityImport as TimeseriesData;
const deWastewater = deWastewaterImport as TimeseriesData;
const averagingWindows = [28];
const extremesForWindow = 28;
const extremeWindow = 3*28;
const mzcrPositivityEnhanced = computeMovingAverageTimeseries(mzcrPositivity, averagingWindows);
const euPositivityEnhanced = computeMovingAverageTimeseries(euPositivity, averagingWindows);
const deWastewaterEnhanced = computeMovingAverageTimeseries(deWastewater, averagingWindows);

// Unified app settings
interface AppSettings {
    timeRange: string;
    includeFuture: boolean;
    showExtremes: boolean;
}

// Default values for app settings
const DEFAULT_APP_SETTINGS: AppSettings = {
    timeRange: "365",
    includeFuture: false,
    showExtremes: false
};

// Settings manager
const APP_SETTINGS_KEY = "appSettings";

function loadAppSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(APP_SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle missing properties
            return { ...DEFAULT_APP_SETTINGS, ...parsed };
        }
    } catch (error) {
        console.error("Error loading app settings:", error);
    }
    return { ...DEFAULT_APP_SETTINGS };
}

function saveAppSettings(settings: AppSettings): void {
    try {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Error saving app settings:", error);
    }
}

// Legacy support - migrate old individual keys to unified settings
function migrateOldSettings(): void {
    const oldTimeRange = localStorage.getItem("selectedTimeRange");
    const oldIncludeFuture = localStorage.getItem("includeFuture");
    const oldShowExtremes = localStorage.getItem("showExtremes");
    
    if (oldTimeRange || oldIncludeFuture || oldShowExtremes) {
        const settings: AppSettings = {
            timeRange: oldTimeRange || DEFAULT_APP_SETTINGS.timeRange,
            includeFuture: oldIncludeFuture ? JSON.parse(oldIncludeFuture) : DEFAULT_APP_SETTINGS.includeFuture,
            showExtremes: oldShowExtremes ? JSON.parse(oldShowExtremes) : DEFAULT_APP_SETTINGS.showExtremes
        };
        saveAppSettings(settings);
        
        // Clean up old keys
        localStorage.removeItem("selectedTimeRange");
        localStorage.removeItem("includeFuture");
        localStorage.removeItem("showExtremes");
    }
}

// Dataset visibility keys (kept separate as recommended)
const DATASET_VISIBILITY_KEY = "datasetVisibility";
const EU_DATASET_VISIBILITY_KEY = "euDatasetVisibility";
const DE_WASTEWATER_VISIBILITY_KEY = "deWastewaterVisibility";

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
    },
    {
        containerId: "deWastewaterContainer",
        canvasId: "deWastewaterChart",
        data: deWastewaterEnhanced,
        title: "Germany Wastewater Surveillance (AMELAG)",
        shortTitle: "DE-WW",
        visibilityKey: DE_WASTEWATER_VISIBILITY_KEY,
        chartHolder: { chart: undefined as Chart | undefined },
        datasetVisibility: { }
    }
];

const container = document.getElementById("root");
renderPage(container);

// Unified settings control creation function
function createUnifiedSettingsControl<K extends keyof AppSettings>(options: {
    type: 'select' | 'checkbox',
    id: string,
    label?: string,
    container: HTMLElement,
    settingKey: K,
    values?: { value: string, label: string }[], // for select
    settings: AppSettings,
    onChange: (key: K, value: AppSettings[K]) => void
}): AppSettings[K] {
    let control: HTMLSelectElement | HTMLInputElement;
    const currentValue = options.settings[options.settingKey];
    
    if (options.type === 'select') {
        control = document.createElement('select');
        control.id = options.id;
        (options.values || []).forEach(opt => {
            const optionElement = document.createElement('option');
            optionElement.value = opt.value;
            optionElement.textContent = opt.label;
            control.appendChild(optionElement);
        });
        (control as HTMLSelectElement).value = currentValue as string;
    } else {
        control = document.createElement('input');
        control.type = 'checkbox';
        control.id = options.id;
        (control as HTMLInputElement).checked = currentValue as boolean;
    }
    
    if (options.label) {
        const label = document.createElement('label');
        label.htmlFor = options.id;
        label.textContent = options.label;
        options.container.appendChild(label);
    }
    options.container.appendChild(control);
    
    control.addEventListener('change', (event) => {
        if (options.type === 'select') {
            const newValue = (event.target as HTMLSelectElement).value;
            options.onChange(options.settingKey, newValue as AppSettings[K]);
        } else {
            const newValue = (event.target as HTMLInputElement).checked;
            options.onChange(options.settingKey, newValue as AppSettings[K]);
        }
    });
    
    return currentValue;
}

// Refactored renderPage to use unified control creation and callback
function renderPage(rootDiv: HTMLElement | null) {
    if (!rootDiv) {
        console.error("Root element not found.");
        return;
    }

    // Migrate old settings if needed
    migrateOldSettings();

    // Load unified settings
    let appSettings = loadAppSettings();

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

    // Unified callback for settings changes
    function onSettingsChange(key?: keyof AppSettings, value?: string | boolean) {
        if (key && value !== undefined) {
            (appSettings as any)[key] = value;
            saveAppSettings(appSettings);
        }
                
        chartConfigs.forEach(cfg => {
            if ((cfg as any).canvas) {
                cfg.chartHolder.chart = updateChart(
                    appSettings.timeRange,
                    cfg,
                    appSettings.includeFuture,
                    appSettings.showExtremes
                );
            }
        });
        updateRatioTable(); // Update ratio table on options change
    }

    // Controls using unified settings
    createUnifiedSettingsControl({
        type: 'select',
        id: 'timeRangeSelect',
        label: undefined,
        container: rootDiv,
        settingKey: 'timeRange',
        values: [
            { value: "30", label: "Last Month" },
            { value: "90", label: "Last 90 Days" },
            { value: "365", label: "Last Year" },
            { value: `${365*2}`, label: "Last 2 Years" },
            { value: "all", label: "All Time" },
        ],
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'includeFutureCheckbox',
        label: 'Include Future Data',
        container: rootDiv,
        settingKey: 'includeFuture',
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'showExtremesCheckbox',
        label: 'Show Min/Max Series',
        container: rootDiv,
        settingKey: 'showExtremes',
        settings: appSettings,
        onChange: onSettingsChange
    });

    // Initial render
    onSettingsChange();

    // Attach event listener to hide all button
    const hideAllButton = document.getElementById('hideAllButton');
    if (hideAllButton) {
        hideAllButton.addEventListener('click', () => hideAllSeries(() => onSettingsChange()));
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

function getSortedSeriesWithIndices(series: LinearSeries[]): { series: LinearSeries, originalIndex: number }[] {
    const seriesWithIndices = series.map((s, index) => ({ series: s, originalIndex: index }));
    seriesWithIndices.sort((a, b) => {
        const labelA = a.series.name;
        const labelB = b.series.name;
        
        // Count words (sections separated by whitespace)
        const wordsA = labelA.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        const wordsB = labelB.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        
        // Sort by word count first
        if (wordsA !== wordsB) {
            return wordsA - wordsB; // fewer words first
        }
        
        // If word count is the same, fall back to alphabetical
        return labelA.localeCompare(labelB);
    });
    return seriesWithIndices;
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
    
    // Apply filtering as a separate step
    const filteredExtremesResults = data.series
        .filter(series => series.type === 'averaged')
        .filter(series => extremesForWindow == series.windowSizeInDays)
        .map(series => filterExtremesByMedianThreshold(
            series, 
            localMaximaSeries.flat().filter(extreme => extreme.originalSeriesName === series.name),
            localMinimaSeries.flat().filter(extreme => extreme.originalSeriesName === series.name)
        ));
    
    const filteredMaximaSeries = filteredExtremesResults.flatMap(result => result.filteredMaxima);
    const filteredMinimaSeries = filteredExtremesResults.flatMap(result => result.filteredMinima);
    
    data = getNewWithSifterToAlignExtremeDates(data, filteredMaximaSeries, 1, 2, true);

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
    const colorPalettes = [
        // Blues palette
        ["#1f77b4", "#4a90e2", "#7bb3f0", "#9cc5f7", "#bed8ff"],
        // Greens palette  
        ["#2ca02c", "#4db84d", "#6bcf6b", "#8ae68a", "#a9fda9"],
        // Reds palette
        ["#d62728", "#e74c3c", "#f16c6c", "#f78b8b", "#fdaaaa"],
        // Purples palette
        ["#9467bd", "#a569d4", "#b86beb", "#cb8dff", "#deadff"]
    ];
    // Sort series and calculate color assignments
    const sortedSeriesWithIndices = getSortedSeriesWithIndices(data.series);
    const numberOfRawData = data.series.filter(series => series.type === 'raw').length;
    
    try {
        const storedVisibility = localStorage.getItem(cfg.visibilityKey);
        cfg.datasetVisibility = storedVisibility ? JSON.parse(storedVisibility) : {};
    } catch (error) {
        console.error("Error parsing dataset visibility from local storage:", error);
    }

    const datasets = generateNormalDatasets(sortedSeriesWithIndices, cfg, numberOfRawData, colorPalettes, data, startIdx, endIdx);
    const barDatasets = generateTestNumberBarDatasets(sortedSeriesWithIndices, cfg, numberOfRawData, colorPalettes, data, startIdx, endIdx);

    const localExtremeDatasets = [
        ...generateLocalExtremeDataset([filteredMaximaSeries], data, cutoffDateString, "red", includeFuture, cfg), 
        ...generateLocalExtremeDataset([filteredMinimaSeries], data, cutoffDateString, "blue", includeFuture, cfg)
    ];

    // Build list of valid series names from all datasets (now includes extreme series always)
    const allDatasetsWithExtremes = [...datasets, ...barDatasets, ...localExtremeDatasets];
    const validSeriesNames = new Set<string>(allDatasetsWithExtremes.map(ds => ds.label));
    
    validSeriesNames.forEach(seriesName => { 
        cfg.datasetVisibility[seriesName] = cfg.datasetVisibility[seriesName] ?? getVisibilityDefault(seriesName);
    });
    Object.keys(cfg.datasetVisibility).forEach(seriesName => {
        if (!validSeriesNames.has(seriesName)) {
            console.log(`Removing visibility for non-existing series: ${seriesName}`);
            delete cfg.datasetVisibility[seriesName];
        }
    });
    localStorage.setItem(cfg.visibilityKey, JSON.stringify(cfg.datasetVisibility));

    if (showExtremes) {
        datasets.push(...localExtremeDatasets);
    }
    const allVisibleDatasets = [...datasets, ...barDatasets];
    allVisibleDatasets.forEach(dataset => {
        dataset.hidden = !cfg.datasetVisibility[dataset.label];
    });

    const newChart = new Chart(cfg.canvas as HTMLCanvasElement, {
        type: "line",
        data: {
            labels,
            datasets: allVisibleDatasets,
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
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    ticks: {
                        callback: function(tickValue: string | number) {
                            if (typeof tickValue === 'number') {
                                return tickValue.toFixed(2) + "%";
                            }
                            return tickValue;
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    ticks: {
                        callback: function(tickValue: string | number) {
                            if (typeof tickValue === 'number') {
                                return tickValue.toLocaleString();
                            }
                            return tickValue;
                        }
                    },
                    grid: {
                        drawOnChartArea: false, // Only draw grid lines for the left y-axis
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
    
    // Create sorted list of datasets with their original indices for proper chart interaction
    const datasetsWithIndices = chart.data.datasets.map((dataset, index) => ({ dataset, index }));
    datasetsWithIndices.sort((a, b) => {
        const labelA = a.dataset.label || `Dataset ${a.index}`;
        const labelB = b.dataset.label || `Dataset ${b.index}`;
        
        // Count words (sections separated by whitespace)
        const wordsA = labelA.trim().split(/\s+/).filter(word => word.length > 0).length;
        const wordsB = labelB.trim().split(/\s+/).filter(word => word.length > 0).length;
        
        // Sort by word count first
        if (wordsA !== wordsB) {
            return wordsA - wordsB; // fewer words first
        }
        
        // If word count is the same, fall back to alphabetical
        return labelA.localeCompare(labelB);
    });
    
    // Create legend items for each dataset in sorted order
    datasetsWithIndices.forEach(({ dataset, index }) => {
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

function generateNormalDatasets(sortedSeriesWithIndices: { series: LinearSeries; originalIndex: number; }[], cfg: ChartConfig, numberOfRawData: number, colorPalettes: string[][], data: TimeseriesData, startIdx: number, endIdx: number) {
    return sortedSeriesWithIndices.map(({ series, originalIndex }, sortedIndex) => {
        // New color assignment logic
        const paletteIndex = sortedIndex % numberOfRawData;
        const colorIndex = Math.floor(sortedIndex / numberOfRawData);
        const selectedPalette = colorPalettes[paletteIndex % colorPalettes.length];
        const borderColor = selectedPalette[colorIndex % selectedPalette.length];

        series.values.forEach((element: any, i: number) => {
            if (element === undefined || element === null) {
                console.warn(`Missing value in series ${series.name} at index ${i}`);
                return;
            }
            // For test/positivity data (not wastewater), warn if there are positive results without tests
            // Wastewater data uses tests=1 for valid data and tests=0 with positive=0 for missing data
            if (element.tests === 0 && element.positive > 0 && !series.name.includes('Wastewater')) {
                console.warn(`Invalid data in series ${series.name} at index ${i}: positive tests ${element.positive} without total tests ${data.dates[i]}`);
            }
        });
        const dataAsPercentage = series.values.slice(startIdx, endIdx).map(datapointToPercentage);
        return {
            label: series.name,
            data: dataAsPercentage,
            borderColor: borderColor,
            fill: false,
            hidden: false,
            borderWidth: 1,
            pointRadius: 0,
        };
    });
}

function generateTestNumberBarDatasets(sortedSeriesWithIndices: { series: LinearSeries; originalIndex: number; }[], cfg: ChartConfig, numberOfRawData: number, colorPalettes: string[][], data: TimeseriesData, startIdx: number, endIdx: number) {
    // Only generate bar charts for raw series (not averaged)
    const rawSeriesWithIndices = sortedSeriesWithIndices.filter(({ series }) => series.type === 'raw');
    
    return rawSeriesWithIndices.flatMap(({ series, originalIndex }, sortedIndex) => {
        // Use same color logic as line charts
        const paletteIndex = sortedIndex % numberOfRawData;
        const selectedPalette = colorPalettes[paletteIndex % colorPalettes.length];
        const positiveColor = selectedPalette[0]; // Use first color for positive
        const negativeColor = selectedPalette[1]; // Use second color for negative

        const positiveData = series.values.slice(startIdx, endIdx).map(dp => dp.positive);
        const negativeData = series.values.slice(startIdx, endIdx).map(dp => dp.tests - dp.positive);

        return [
            {
                label: `${series.name} - Positive Tests`,
                data: positiveData,
                backgroundColor: positiveColor,
                borderColor: positiveColor,
                type: 'bar' as const,
                yAxisID: 'y1',
                stack: `stack-${series.name}`,
                hidden: false,
            },
            {
                label: `${series.name} - Negative Tests`,
                data: negativeData,
                backgroundColor: negativeColor,
                borderColor: negativeColor,
                type: 'bar' as const,
                yAxisID: 'y1',
                stack: `stack-${series.name}`,
                hidden: false,
            }
        ];
    });
}

function generateLocalExtremeDataset(extremeData: ExtremeSeries[][], normalData: TimeseriesData, cutoffDateString: string, color: string, includeFuture: boolean, cfg: ChartConfig): any[] {
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

function getVisibilityDefault(label: string): boolean {
    // Hide min/max datasets by default
    if (label.toLowerCase().includes("max") || label.toLowerCase().includes("min")) {
        return false;
    }
    
    // Hide shifted datasets by default (these typically contain "shifted" in their name)
    if (label.toLowerCase().includes("shifted")) {
        return false;
    }

    // Hide test number bar charts by default (these contain "Tests" in their name)
    if (label.toLowerCase().includes("tests")) {
        return false;
    }

    // Show all other datasets by default
    return true;
}

