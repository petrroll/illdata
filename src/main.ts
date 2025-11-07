import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import euPositivityImport from "../data_processed/eu_sentinel_ervis/positivity_data.json" with { type: "json" };
import deWastewaterImport from "../data_processed/de_wastewater_amelag/wastewater_data.json" with { type: "json" };
import lastUpdateTimestamp from "../data_processed/timestamp.json" with { type: "json" };

import { Chart, Legend } from 'chart.js/auto';
import { computeMovingAverageTimeseries, findLocalExtreme, filterExtremesByMedianThreshold, getNewWithSifterToAlignExtremeDates, getNewWithCustomShift, calculateRatios, type TimeseriesData, type ExtremeSeries, type RatioData, type DataSeries, type PositivitySeries, datapointToPercentage, compareLabels } from "./utils";

const mzcrPositivity = mzcrPositivityImport as TimeseriesData;
const euPositivity = euPositivityImport as TimeseriesData;
const deWastewater = deWastewaterImport as TimeseriesData;
const averagingWindows = [28];
const extremesForWindow = 28;
const extremeWindow = 3*28;
const mzcrPositivityEnhanced = computeMovingAverageTimeseries(mzcrPositivity, averagingWindows);
const euPositivityEnhanced = computeMovingAverageTimeseries(euPositivity, averagingWindows);
const deWastewaterEnhanced = computeMovingAverageTimeseries(deWastewater, averagingWindows);

// Constants for dataset filtering
const SHIFTED_SERIES_IDENTIFIER = 'shifted';
const TEST_NUMBERS_IDENTIFIER = 'tests';
const MIN_MAX_IDENTIFIER = ['min', 'max'];

// Unified app settings
// Alignment method type: 'days' for manual shift by days, 'maxima'/'minima' for automatic wave alignment
type AlignByExtreme = 'days' | 'maxima' | 'minima';

interface AppSettings {
    timeRange: string;
    includeFuture: boolean;
    showExtremes: boolean;
    showShifted: boolean;
    showTestNumbers: boolean;
    // Shift value: either days for manual shift or wave count for automatic alignment
    // When alignByExtreme is 'days': shift by this many days
    // When alignByExtreme is 'maxima' or 'minima': shift by this many waves back to align to the last wave
    shiftOverride: number | null;
    // Alignment method: 'days' for manual shift, 'maxima'/'minima' for automatic alignment
    alignByExtreme: AlignByExtreme;
}

// Default values for app settings
const DEFAULT_APP_SETTINGS: AppSettings = {
    timeRange: "365",
    includeFuture: false,
    showExtremes: false,
    showShifted: true,
    showTestNumbers: true,
    shiftOverride: 1, // Default to 1 wave for maxima/minima alignment
    alignByExtreme: 'maxima'
};

// Settings manager
const APP_SETTINGS_KEY = "appSettings";

function loadAppSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(APP_SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Migrate old useCustomShift setting to new alignByExtreme format
            if ('useCustomShift' in parsed) {
                if (parsed.useCustomShift === true) {
                    parsed.alignByExtreme = 'days';
                }
                delete parsed.useCustomShift;
            }
            // Migrate old shiftOverrideDays to new shiftOverride name
            if ('shiftOverrideDays' in parsed) {
                parsed.shiftOverride = parsed.shiftOverrideDays;
                delete parsed.shiftOverrideDays;
            }
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
            ...DEFAULT_APP_SETTINGS,
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
const EU_COUNTRY_FILTER_KEY = "euCountryFilter";
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
    // Cache for extremes calculations to avoid recalculating on every render
    extremesCache?: {
        localMaximaSeries: ExtremeSeries[][];
        localMinimaSeries: ExtremeSeries[][];
        filteredMaximaSeries: ExtremeSeries[];
        filteredMinimaSeries: ExtremeSeries[];
    };
    hasCountryFilter?: boolean;
    countryFilterKey?: string;
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
        datasetVisibility: { },
        hasCountryFilter: true,
        countryFilterKey: EU_COUNTRY_FILTER_KEY
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

function createCountrySelector(cfg: ChartConfig, countryFilters: Map<string, string>, onSettingsChange: () => void) {
    const container = document.getElementById(cfg.containerId);
    if (!container) {
        console.error(`Container not found: ${cfg.containerId}`);
        return;
    }

    // Get available countries from the data
    const countries = getAvailableCountries(cfg.data);
    if (countries.length === 0) {
        console.warn(`No countries found in data for ${cfg.containerId}`);
        return;
    }

    // Create a wrapper div for the selector with minimal styling
    const selectorWrapper = document.createElement('div');
    selectorWrapper.id = `${cfg.containerId}-country-selector`;
    selectorWrapper.style.marginBottom = '10px';

    // Create label
    const label = document.createElement('label');
    label.htmlFor = `${cfg.containerId}-country-select`;
    label.textContent = 'Country: ';

    // Create select element with minimal styling
    const select = document.createElement('select');
    select.id = `${cfg.containerId}-country-select`;

    // Add options
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        select.appendChild(option);
    });

    // Set current value
    const currentCountry = countryFilters.get(cfg.containerId) || "EU/EEA";
    select.value = currentCountry;

    // Add change handler
    select.addEventListener('change', () => {
        const newCountry = select.value;
        countryFilters.set(cfg.containerId, newCountry);
        if (cfg.countryFilterKey) {
            saveCountryFilter(cfg.countryFilterKey, newCountry);
        }
        onSettingsChange();
    });

    selectorWrapper.appendChild(label);
    selectorWrapper.appendChild(select);

    // Insert the selector at the beginning of the container (above the chart)
    container.insertBefore(selectorWrapper, container.firstChild);
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

    // Load country filters for charts that have them
    const countryFilters = new Map<string, string>();
    chartConfigs.forEach(cfg => {
        if (cfg.hasCountryFilter && cfg.countryFilterKey) {
            countryFilters.set(cfg.containerId, loadCountryFilter(cfg.countryFilterKey));
        }
    });

    // Unified callback for settings changes
    function onSettingsChange(key?: keyof AppSettings, value?: AppSettings[keyof AppSettings]) {
        if (key && value !== undefined) {
            (appSettings as any)[key] = value;
            saveAppSettings(appSettings);
        }
                
        chartConfigs.forEach(cfg => {
            if ((cfg as any).canvas) {
                const countryFilter = cfg.hasCountryFilter ? countryFilters.get(cfg.containerId) : undefined;
                cfg.chartHolder.chart = updateChart(
                    appSettings.timeRange,
                    cfg,
                    appSettings.includeFuture,
                    appSettings.showExtremes,
                    appSettings.showShifted,
                    appSettings.showTestNumbers,
                    appSettings.shiftOverride,
                    appSettings.alignByExtreme,
                    countryFilter
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
            { value: "180", label: "Last 180 Days" },
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

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'showShiftedCheckbox',
        label: 'Show Shifted Series',
        container: rootDiv,
        settingKey: 'showShifted',
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'showTestNumbersCheckbox',
        label: 'Show Test Numbers',
        container: rootDiv,
        settingKey: 'showTestNumbers',
        settings: appSettings,
        onChange: onSettingsChange
    });

    // Shift settings controls
    // Shift value input (number input)
    const shiftDaysInput = document.createElement('input');
    shiftDaysInput.type = 'number';
    shiftDaysInput.id = 'shiftOverrideInput';
    shiftDaysInput.value = (appSettings.shiftOverride ?? 1).toString();
    shiftDaysInput.placeholder = 'Shift value';
    shiftDaysInput.style.width = '80px';
    
    const shiftDaysLabel = document.createElement('label');
    shiftDaysLabel.htmlFor = 'shiftOverrideInput';
    shiftDaysLabel.textContent = 'Shift By:';
    rootDiv.appendChild(shiftDaysLabel);
    rootDiv.appendChild(shiftDaysInput);
    
    shiftDaysInput.addEventListener('change', (event) => {
        const inputValue = (event.target as HTMLInputElement).value.trim();
        if (inputValue === '') {
            // Default to 1 for wave indices, 0 for days
            const defaultValue = appSettings.alignByExtreme === 'days' ? 0 : 1;
            onSettingsChange('shiftOverride', defaultValue);
            shiftDaysInput.value = defaultValue.toString();
            return;
        }
        
        const value = parseInt(inputValue);
        if (isNaN(value)) {
            // Reset to previous valid value
            shiftDaysInput.value = (appSettings.shiftOverride ?? 1).toString();
            return;
        }
        
        // For wave indices (maxima/minima), minimum is 1. For days, allow negative values.
        let clampedValue = value;
        if (appSettings.alignByExtreme !== 'days') {
            // For maxima/minima: clamp to 1-10 waves
            clampedValue = Math.max(1, Math.min(10, value));
        } else {
            // For days: clamp to reasonable range (-3650 to 3650 days, approximately 10 years)
            clampedValue = Math.max(-3650, Math.min(3650, value));
        }
        
        if (clampedValue !== value) {
            shiftDaysInput.value = clampedValue.toString();
        }
        
        onSettingsChange('shiftOverride', clampedValue);
    });

    // Align by selector (days/maxima/minima)
    createUnifiedSettingsControl({
        type: 'select',
        id: 'alignByExtremeSelect',
        label: '',
        container: rootDiv,
        settingKey: 'alignByExtreme',
        values: [
            { value: 'days', label: 'Days' },
            { value: 'maxima', label: 'Maxima' },
            { value: 'minima', label: 'Minima' }
        ],
        settings: appSettings,
        onChange: (key, value) => {
            // When switching alignment mode, reset the shift value to a sensible default
            if (key === 'alignByExtreme') {
                const newMode = value as AlignByExtreme;
                const defaultValue = newMode === 'days' ? 0 : 1;
                // Update the input value
                shiftDaysInput.value = defaultValue.toString();
                // Update settings
                appSettings.shiftOverride = defaultValue;
            }
            onSettingsChange(key, value);
        }
    });
  
    // Create country selectors for charts that have them
    chartConfigs.forEach(cfg => {
        if (cfg.hasCountryFilter && cfg.countryFilterKey) {
            createCountrySelector(cfg, countryFilters, onSettingsChange);
        }
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

function getAvailableCountries(data: TimeseriesData): string[] {
    const countries = new Set<string>();
    data.series.forEach(series => {
        if (series.country) {
            countries.add(series.country);
        }
    });
    return Array.from(countries).sort();
}

function filterDataByCountry(data: TimeseriesData, country: string): TimeseriesData {
    return {
        dates: data.dates,
        series: data.series.filter(series => series.country === country)
    };
}

function loadCountryFilter(key: string): string {
    try {
        const stored = localStorage.getItem(key);
        return stored || "EU/EEA";
    } catch (error) {
        console.error("Error loading country filter:", error);
        return "EU/EEA";
    }
}

function saveCountryFilter(key: string, country: string): void {
    try {
        localStorage.setItem(key, country);
    } catch (error) {
        console.error("Error saving country filter:", error);
    }
}

function getSortedSeriesWithIndices(series: DataSeries[]): { series: DataSeries, originalIndex: number }[] {
    const seriesWithIndices = series.map((s, index) => ({ series: s, originalIndex: index }));
    seriesWithIndices.sort((a, b) => compareLabels(a.series.name, b.series.name));
    return seriesWithIndices;
}

function updateChart(timeRange: string, cfg: ChartConfig, includeFuture: boolean = true, showExtremes: boolean = false, showShifted: boolean = true, showTestNumbers: boolean = true, shiftOverride: number | null = null, alignByExtreme: AlignByExtreme = 'maxima', countryFilter?: string) {
    // Destroy existing chart if it exists
    if (cfg.chartHolder.chart) {
        cfg.chartHolder.chart.destroy();
    }

    let data = cfg.data;
    
    // Apply country filter if applicable
    // Note: "EU/EEA" is a valid country value in the data representing aggregate European data
    if (countryFilter && cfg.hasCountryFilter) {
        data = filterDataByCountry(data, countryFilter);
    }
    let cutoffDateString = data.dates[0] ?? new Date().toISOString().split('T')[0];
    if (timeRange !== "all") {
        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDateString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Calculate extremes only once and cache them
    if (!cfg.extremesCache) {
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
        
        cfg.extremesCache = {
            localMaximaSeries,
            localMinimaSeries,
            filteredMaximaSeries,
            filteredMinimaSeries
        };
    }
    
    const { filteredMaximaSeries, filteredMinimaSeries, localMaximaSeries, localMinimaSeries } = cfg.extremesCache;
    
    // Apply shift based on settings
    if (alignByExtreme === 'days') {
        // Manual shift by specified number of days (use 0 if null)
        const shiftDays = shiftOverride ?? 0;
        data = getNewWithCustomShift(data, shiftDays, true);
    } else {
        // Use automatic alignment based on extreme type preference and wave count
        const extremesToAlign = alignByExtreme === 'maxima' ? filteredMaximaSeries : filteredMinimaSeries;
        // Use shiftOverride to specify how many waves back to align to the last wave
        // waveCount = 1 means align the 1st wave back (2nd-to-last) to the last wave
        // waveCount = 2 means align the 2nd wave back (3rd-to-last) to the last wave
        const waveCount = (shiftOverride && shiftOverride > 0) ? shiftOverride : 1;
        // Always align to the last wave (index 1), from wave at index (1 + waveCount)
        data = getNewWithSifterToAlignExtremeDates(data, extremesToAlign, 1, 1 + waveCount, true);
    }

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

    let datasets = generateNormalDatasets(sortedSeriesWithIndices, cfg, numberOfRawData, colorPalettes, data, startIdx, endIdx);
    let barDatasets = generateTestNumberBarDatasets(sortedSeriesWithIndices, cfg, numberOfRawData, colorPalettes, data, startIdx, endIdx);

    // Filter shifted series based on showShifted setting
    if (!showShifted) {
        datasets = datasets.filter(ds => !ds.label.toLowerCase().includes(SHIFTED_SERIES_IDENTIFIER));
    }

    // Filter test number series based on showTestNumbers setting
    if (!showTestNumbers) {
        barDatasets = barDatasets.filter(ds => !ds.label.toLowerCase().includes(TEST_NUMBERS_IDENTIFIER));
    }

    const localExtremeDatasets = [
        ...generateLocalExtremeDataset([filteredMaximaSeries], data, cutoffDateString, "red", includeFuture, cfg), 
        ...generateLocalExtremeDataset([filteredMinimaSeries], data, cutoffDateString, "blue", includeFuture, cfg)
    ];

    // Build list of valid series names from all datasets (now includes extreme series always)
    const allDatasetsWithExtremes = [...datasets, ...barDatasets, ...localExtremeDatasets];
    const validSeriesNames = new Set<string>(allDatasetsWithExtremes.map(ds => ds.label));
    
    // Build a map of base series names to current series names for preserving visibility
    const baseToCurrentSeriesMap = new Map<string, string>();
    validSeriesNames.forEach(seriesName => {
        const baseName = getBaseSeriesName(seriesName);
        baseToCurrentSeriesMap.set(baseName, seriesName);
    });
    
    // Initialize visibility for new series, checking both exact name and base name for previous state
    validSeriesNames.forEach(seriesName => {
        if (cfg.datasetVisibility[seriesName] === undefined) {
            // Check if we have visibility state for the base series name (from a different shift)
            const baseName = getBaseSeriesName(seriesName);
            
            // Find all previous series with the same base name
            const allPreviousMatches = Object.keys(cfg.datasetVisibility).filter(key => {
                return getBaseSeriesName(key) === baseName;
            });
            
            if (allPreviousMatches.length > 0) {
                // Use the MOST RECENT match (last in the array, since Object.keys() returns in insertion order)
                const previousVisibility = allPreviousMatches[allPreviousMatches.length - 1];
                // Preserve visibility from previous shift of the same series
                cfg.datasetVisibility[seriesName] = cfg.datasetVisibility[previousVisibility];
            } else {
                // No previous state, use default
                cfg.datasetVisibility[seriesName] = getVisibilityDefault(seriesName, showShifted, showTestNumbers);
            }
        }
    });
    
    // Clean up visibility state for series that no longer exist
    Object.keys(cfg.datasetVisibility).forEach(seriesName => {
        if (!validSeriesNames.has(seriesName)) {
            // This series is no longer in the current render
            // Check if this is an old version of a current series (different shift)
            const baseName = getBaseSeriesName(seriesName);
            const currentSeriesWithSameBase = baseToCurrentSeriesMap.get(baseName);
            
            if (currentSeriesWithSameBase && cfg.datasetVisibility[currentSeriesWithSameBase] !== undefined) {
                // We've already transferred visibility to the current version, safe to remove old version
                delete cfg.datasetVisibility[seriesName];
            } else if (!baseToCurrentSeriesMap.has(baseName)) {
                // Base series no longer exists at all, remove
                delete cfg.datasetVisibility[seriesName];
            }
            // Otherwise keep temporarily until visibility is transferred
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
            layout: {
                padding: {
                    bottom: 10  // Add padding to accommodate rotated x-axis labels
                }
            },
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
                        autoSkip: true,
                        autoSkipPadding: 15,
                        maxRotation: 45,
                        minRotation: 0,
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
                                // Check if this is a scalar series chart (e.g., wastewater)
                                const isScalarChart = cfg.data.series.some(s => 'dataType' in s && s.dataType === 'scalar');
                                if (isScalarChart) {
                                    // For scalar series, show the value with scientific notation if needed
                                    return tickValue.toExponential(2);
                                } else {
                                    // For positivity data, show as percentage
                                    return tickValue.toFixed(2) + "%";
                                }
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
            margin: 30px 0 10px 0;
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
        return compareLabels(labelA, labelB);
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

function generateNormalDatasets(sortedSeriesWithIndices: { series: DataSeries; originalIndex: number; }[], cfg: ChartConfig, numberOfRawData: number, colorPalettes: string[][], data: TimeseriesData, startIdx: number, endIdx: number) {
    return sortedSeriesWithIndices.map(({ series, originalIndex }, sortedIndex) => {
        // New color assignment logic
        const paletteIndex = sortedIndex % numberOfRawData;
        const colorIndex = Math.floor(sortedIndex / numberOfRawData);
        const selectedPalette = colorPalettes[paletteIndex % colorPalettes.length];
        const borderColor = selectedPalette[colorIndex % selectedPalette.length];

        // Validate data based on type
        if ('dataType' in series && series.dataType === 'positivity') {
            series.values.forEach((element: any, i: number) => {
                if (element === undefined || element === null) {
                    console.warn(`Missing value in series ${series.name} at index ${i}`);
                    return;
                }
                if (element.tests === 0 && element.positive > 0) {
                    console.warn(`Invalid data in series ${series.name} at index ${i}: positive tests ${element.positive} without total tests ${data.dates[i]}`);
                }
            });
        }
        
        // Convert data based on type
        let chartData: number[];
        if ('dataType' in series && series.dataType === 'scalar') {
            // For scalar series, use the value directly (no percentage conversion)
            chartData = series.values.slice(startIdx, endIdx).map((dp: any) => {
                if (!dp) return 0;
                return dp.virusLoad || 0;
            });
        } else {
            // For positivity data, convert to percentage
            chartData = series.values.slice(startIdx, endIdx).map(datapointToPercentage);
        }
        
        return {
            label: series.name,
            data: chartData,
            borderColor: borderColor,
            fill: false,
            hidden: false,
            borderWidth: 1,
            pointRadius: 0,
        };
    });
}

/**
 * Adjusts the color for test bar charts by adjusting saturation and lightness
 * to create better contrast between positive and negative test bars.
 * Positive tests are more saturated, negative tests are less saturated.
 * 
 * @param hexColor - The original color in hex format (e.g., "#1f77b4")
 * @param isPositive - Whether this is for positive tests (more saturated) or negative tests (less saturated)
 * @returns The adjusted color in hex format
 */
function adjustColorForTestBars(hexColor: string, isPositive: boolean): string {
    // Color adjustment constants
    const POSITIVE_SATURATION_FACTOR = 0.85; // Keep most saturation for positive tests
    const NEGATIVE_SATURATION_FACTOR = 0.4; // Reduce saturation more for negative tests
    const POSITIVE_LIGHTNESS_REDUCTION = 0.05; // Slightly darken positive tests to maintain saturation appearance
    const POSITIVE_LIGHTNESS_MIN = 0.3; // Floor positive lightness
    const NEGATIVE_LIGHTNESS_BOOST = 0.15; // Lighten negative tests for contrast
    const NEGATIVE_LIGHTNESS_MAX = 0.75; // Cap negative lightness

    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Convert RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    // Adjust saturation and lightness for contrast
    // Positive tests: more saturated and slightly darker
    // Negative tests: less saturated and lighter
    if (isPositive) {
        s = s * POSITIVE_SATURATION_FACTOR;
        l = Math.max(l - POSITIVE_LIGHTNESS_REDUCTION, POSITIVE_LIGHTNESS_MIN);
    } else {
        s = s * NEGATIVE_SATURATION_FACTOR;
        l = Math.min(l + NEGATIVE_LIGHTNESS_BOOST, NEGATIVE_LIGHTNESS_MAX);
    }

    // Convert HSL back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };

    let r2, g2, b2;
    if (s === 0) {
        r2 = g2 = b2 = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r2 = hue2rgb(p, q, h + 1/3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1/3);
    }

    // Convert back to hex
    const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

function generateTestNumberBarDatasets(sortedSeriesWithIndices: { series: DataSeries; originalIndex: number; }[], cfg: ChartConfig, numberOfRawData: number, colorPalettes: string[][], data: TimeseriesData, startIdx: number, endIdx: number) {
    // Only generate bar charts for raw positivity series (not averaged, not scalar)
    const rawPositivitySeriesWithIndices = sortedSeriesWithIndices.filter(({ series }) => 
        series.type === 'raw' && 'dataType' in series && series.dataType === 'positivity'
    );
    
    return rawPositivitySeriesWithIndices.flatMap(({ series, originalIndex }, sortedIndex) => {
        // Use same color logic as line charts
        const paletteIndex = sortedIndex % numberOfRawData;
        const selectedPalette = colorPalettes[paletteIndex % colorPalettes.length];
        const basePositiveColor = selectedPalette[0]; // Use first color for positive
        const baseNegativeColor = selectedPalette[1]; // Use second color for negative

        // Adjust colors: reduce saturation and increase contrast
        const positiveColor = adjustColorForTestBars(basePositiveColor, true);
        const negativeColor = adjustColorForTestBars(baseNegativeColor, false);

        const positiveData = (series as PositivitySeries).values.slice(startIdx, endIdx).map((dp: any) => dp.positive);
        const negativeData = (series as PositivitySeries).values.slice(startIdx, endIdx).map((dp: any) => dp.tests - dp.positive);

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
        const originalSeries = normalData.series.find(series => series.name === extrSeries.originalSeriesName);
        return {
            label: extrSeries.name,
            data: extrSeries.indices.map(index => {
                let yValue: number;
                if (originalSeries && 'dataType' in originalSeries && originalSeries.dataType === 'scalar') {
                    yValue = (originalSeries.values[index] as any)?.virusLoad ?? 0;
                } else {
                    yValue = datapointToPercentage(originalSeries?.values[index] as any) ?? -10;
                }
                return {
                    x: normalData.dates[index],
                    y: yValue
                };
            }).filter(dp => dp.x > cutoffDateString && (includeFuture || dp.x <= todayString)) as any[],
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

        // Filter series for ratio table
        const filteredSeries = cfg.data.series.filter(series => {
            if (series.type !== 'raw') return false;
            
            // For EU chart, use the selected country from the filter
            if (cfg.hasCountryFilter && series.country && cfg.countryFilterKey) {
                const selectedCountry = loadCountryFilter(cfg.countryFilterKey);
                if (series.country !== selectedCountry) {
                    return false;
                }
            }
            
            // Check if any key in datasetVisibility contains this series name and has a true value
            return Object.entries(cfg.datasetVisibility).some(([key, isVisible]) => {
                return key.includes(series.name) && isVisible;
            });
        });

        // Create a filtered dataset for this chart with only the relevant series
        const filteredData: TimeseriesData = {
            dates: cfg.data.dates,
            series: filteredSeries
        };

        const visibleSeriesNames = filteredSeries.map(series => series.name);
        visiblePerChart.push([{ ...cfg, data: filteredData }, visibleSeriesNames]);
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
            
            // Handle NaN, Infinity, and null values
            if (value === null || isNaN(value) || !isFinite(value)) {
                cell.textContent = 'N/A';
            } else {
                cell.textContent = value.toFixed(2) + 'x';
                
                // Add color coding based on ratio values
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

/**
 * Extracts the base series name without shift information.
 * This allows tracking visibility across different shift values.
 * Only strips shift suffix if the series is actually a shifted series to avoid
 * collision with non-shifted series that might have similar names.
 * 
 * Examples:
 * - "PCR Positivity (28d avg) shifted by 1 wave -347d" -> "PCR Positivity (28d avg)"
 * - "PCR Positivity (28d avg) shifted by -300d (custom)" -> "PCR Positivity (28d avg)"
 * - "Influenza Positivity" -> "Influenza Positivity" (unchanged, no shift info)
 * - "Influenza Positivity (28d avg)" -> "Influenza Positivity (28d avg)" (unchanged, no shift info)
 */
function getBaseSeriesName(label: string): string {
    // Only process if the label contains the shifted series identifier
    // This prevents collision with non-shifted series
    if (!label.toLowerCase().includes(SHIFTED_SERIES_IDENTIFIER)) {
        return label;
    }
    
    // Replace only the dynamic changing parts in shifted series labels:
    // - "shifted by X wave(s) -XXXd" → "shifted by N waves"
    // - "shifted by -XXXd (custom)" → "shifted by N (custom)"
    // This preserves the "shifted by" part to avoid collision with base series
    return label
        .replace(/ shifted by \d+ waves? -\d+d/, ' shifted by N waves')
        .replace(/ shifted by -?\d+d \(custom\)/, ' shifted by N (custom)')
        .trim();
}

function getVisibilityDefault(label: string, showShifted: boolean = true, showTestNumbers: boolean = true): boolean {
    const lowerLabel = label.toLowerCase();
    
    // Hide min/max datasets by default
    if (MIN_MAX_IDENTIFIER.some(id => lowerLabel.includes(id))) {
        return false;
    }
    
    // Show/hide shifted datasets based on setting (default: shown)
    if (lowerLabel.includes(SHIFTED_SERIES_IDENTIFIER)) {
        return showShifted;
    }

    // Show/hide test number bar charts based on setting (default: shown)
    if (lowerLabel.includes(TEST_NUMBERS_IDENTIFIER)) {
        return showTestNumbers;
    }

    // Show all other datasets by default
    return true;
}

