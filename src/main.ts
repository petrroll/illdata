import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import euPositivityImport from "../data_processed/eu_sentinel_ervis/positivity_data.json" with { type: "json" };
import deWastewaterImport from "../data_processed/de_wastewater_amelag/wastewater_data.json" with { type: "json" };
import nlInfectieradarImport from "../data_processed/nl_infectieradar/positivity_data.json" with { type: "json" };
import lastUpdateTimestamp from "../data_processed/timestamp.json" with { type: "json" };

import { Chart, Legend } from 'chart.js/auto';
import { computeMovingAverageTimeseries, findLocalExtreme, filterExtremesByMedianThreshold, getNewWithSifterToAlignExtremeDates, getNewWithCustomShift, calculateRatios, type TimeseriesData, type ExtremeSeries, type RatioData, type DataSeries, type PositivitySeries, datapointToPercentage, compareLabels, getColorBaseSeriesName, isScalarSeries } from "./utils";
import { getLanguage, setLanguage, getTranslations, translateSeriesName, normalizeSeriesName, type Language } from "./locales";
import { createRegularLegendButton, createSplitTestPill, createSplitShiftedPill, type ChartConfig as LegendChartConfig } from "./ui/legend-utils";
import { 
    SHIFTED_SERIES_IDENTIFIER, 
    isShiftedSeries,
    isTestNumberSeries,
    isPositiveTestSeries,
    isNegativeTestSeries,
    getTestPairBaseName,
    isShiftedTestNumberSeries,
    getBaseSeriesName,
    getBaseSeriesNameWithoutShift,
    getVisibilityDefault
} from "./series-utils";
import { type AppSettings, type AlignByExtreme, DEFAULT_APP_SETTINGS, APP_SETTINGS_KEY, loadAppSettings, saveAppSettings, migrateOldSettings } from "./settings";
import { type UrlState, type UrlChartConfig, encodeUrlState, decodeUrlState, loadStateFromUrl, applyUrlState } from "./urlstate";
import { extractShiftFromLabel } from "./tooltip";
import { adjustColorForTestBars } from "./color";
import { compareTooltipItems, type TooltipItem } from "./tooltip-formatting";

const mzcrPositivity = mzcrPositivityImport as TimeseriesData;
const euPositivity = euPositivityImport as TimeseriesData;
const deWastewater = deWastewaterImport as TimeseriesData;
const nlInfectieradar = nlInfectieradarImport as TimeseriesData;
const averagingWindows = [28];
const extremesForWindow = 28;
const extremeWindow = 3*28;
const mzcrPositivityEnhanced = computeMovingAverageTimeseries(mzcrPositivity, averagingWindows);
const euPositivityEnhanced = computeMovingAverageTimeseries(euPositivity, averagingWindows);
const deWastewaterEnhanced = computeMovingAverageTimeseries(deWastewater, averagingWindows);
const nlInfectieradarEnhanced = computeMovingAverageTimeseries(nlInfectieradar, averagingWindows);

// Constants for chart styling
const SHIFTED_LINE_DASH_PATTERN = [15, 1]; // Dash pattern for shifted series: [dash length, gap length] - very subtle, almost solid pattern

// Dataset visibility keys (kept separate as recommended)
const DATASET_VISIBILITY_KEY = "datasetVisibility";
const EU_DATASET_VISIBILITY_KEY = "euDatasetVisibility";
const EU_COUNTRY_FILTER_KEY = "euCountryFilter";
const EU_SURVTYPE_FILTER_KEY = "euSurvtypeFilter";
const DE_WASTEWATER_VISIBILITY_KEY = "deWastewaterVisibility";
const NL_INFECTIERADAR_VISIBILITY_KEY = "nlInfectieradarVisibility";

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
    hasSurvtypeFilter?: boolean;
    survtypeFilterKey?: string;
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
        countryFilterKey: EU_COUNTRY_FILTER_KEY,
        hasSurvtypeFilter: true,
        survtypeFilterKey: EU_SURVTYPE_FILTER_KEY
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
    },
    {
        containerId: "nlInfectieradarContainer",
        canvasId: "nlInfectieradarChart",
        data: nlInfectieradarEnhanced,
        title: "Netherlands Infectieradar Pathogens",
        shortTitle: "NL-IR",
        visibilityKey: NL_INFECTIERADAR_VISIBILITY_KEY,
        chartHolder: { chart: undefined as Chart | undefined },
        datasetVisibility: { }
    }
];

// Function to update all static UI texts based on current language
function updateAllUITexts() {
    const t = translations;
    
    // Update page title
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = t.pageTitle;
    
    // Update footer
    const footerAboutLink = document.getElementById("footerAboutLink") as HTMLAnchorElement;
    if (footerAboutLink) {
        footerAboutLink.textContent = t.footerAbout;
        // Update href to point to correct language version
        footerAboutLink.href = currentLanguage === 'cs' ? 'about-cs.html' : 'about.html';
    }
    
    const footerGithubLink = document.getElementById("footerGithubLink");
    if (footerGithubLink) footerGithubLink.textContent = t.footerGithub;
    
    const footerGetLinkButton = document.getElementById("getLinkButton");
    if (footerGetLinkButton) footerGetLinkButton.textContent = t.footerGetLink;
    
    const footerLastUpdateLabel = document.getElementById("footerLastUpdateLabel");
    if (footerLastUpdateLabel) footerLastUpdateLabel.textContent = t.footerLastUpdate;
    
    // Update trends table title
    const trendsTableTitle = document.getElementById("trendsTableTitle");
    if (trendsTableTitle) trendsTableTitle.textContent = t.trendsTableTitle;
    
    const trendPeriodHeader = document.getElementById("trendPeriodHeader");
    if (trendPeriodHeader) trendPeriodHeader.textContent = t.trendsTablePeriodLabel;
    
    // Update hide all button
    const hideAllButton = document.getElementById("hideAllButton");
    if (hideAllButton) hideAllButton.textContent = t.hideAllButton;
    
    // Update chart titles (these will be updated when charts are re-rendered)
    chartConfigs[0].title = t.chartTitleCzechCovid;
    chartConfigs[1].title = t.chartTitleEuViruses;
    chartConfigs[2].title = t.chartTitleDeWastewater;
    chartConfigs[3].title = t.chartTitleNlInfectieradar;
}

// Initialize UI texts
// (moved after language initialization)

const container = document.getElementById("root");

// Initialize language system
let currentLanguage = getLanguage();
let translations = getTranslations(currentLanguage);

// Now we can safely call updateAllUITexts
updateAllUITexts();

// Set up language switcher
const languageSelect = document.getElementById("languageSelect") as HTMLSelectElement;

// Flag to prevent recursive renderPage calls
let isRendering = false;

// Helper function to change language and update UI
function changeLanguageAndUpdate(newLang: Language) {
    setLanguage(newLang);
    currentLanguage = newLang;
    translations = getTranslations(newLang);
    
    // Update select element
    if (languageSelect) {
        languageSelect.value = newLang;
    }
    
    // Update all UI texts
    updateAllUITexts();
    
    // Update chart titles and re-render charts with translated labels
    // Only render if not already rendering to prevent infinite loops
    if (!isRendering) {
        renderPage(container);
    }
}

if (languageSelect) {
    languageSelect.value = currentLanguage;
    languageSelect.addEventListener('change', () => {
        const newLang = languageSelect.value as Language;
        changeLanguageAndUpdate(newLang);
    });
}

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
    label.textContent = translations.countryLabel;

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

function createSurvtypeSelector(cfg: ChartConfig, survtypeFilters: Map<string, string>, onSettingsChange: () => void) {
    const container = document.getElementById(cfg.containerId);
    if (!container) {
        console.error(`Container not found: ${cfg.containerId}`);
        return;
    }

    // Create a wrapper div for the selector with minimal styling
    const selectorWrapper = document.createElement('div');
    selectorWrapper.id = `${cfg.containerId}-survtype-selector`;
    selectorWrapper.style.marginBottom = '10px';

    // Create label
    const label = document.createElement('label');
    label.htmlFor = `${cfg.containerId}-survtype-select`;
    // Get fresh translations for current language
    const currentTranslations = getTranslations();
    label.textContent = currentTranslations.survtypeLabel;
    label.style.marginRight = '5px';

    // Create select element with minimal styling
    const select = document.createElement('select');
    select.id = `${cfg.containerId}-survtype-select`;

    // Add options for surveillance types using translations
    const survtypes = [
        { value: "both", label: currentTranslations.survtypeBoth },
        { value: "primary care sentinel", label: currentTranslations.survtypeSentinel },
        { value: "non-sentinel", label: currentTranslations.survtypeNonSentinel }
    ];

    survtypes.forEach(st => {
        const option = document.createElement('option');
        option.value = st.value;
        option.textContent = st.label;
        select.appendChild(option);
    });

    // Set current value
    const currentSurvtype = survtypeFilters.get(cfg.containerId) || "both";
    select.value = currentSurvtype;

    // Add change handler
    select.addEventListener('change', () => {
        const newSurvtype = select.value;
        survtypeFilters.set(cfg.containerId, newSurvtype);
        if (cfg.survtypeFilterKey) {
            saveSurvtypeFilter(cfg.survtypeFilterKey, newSurvtype);
        }
        onSettingsChange();
    });

    selectorWrapper.appendChild(label);
    selectorWrapper.appendChild(select);

    // Insert after country selector if it exists, otherwise at the beginning
    const countrySelector = document.getElementById(`${cfg.containerId}-country-selector`);
    if (countrySelector && countrySelector.nextSibling) {
        container.insertBefore(selectorWrapper, countrySelector.nextSibling);
    } else {
        container.insertBefore(selectorWrapper, container.firstChild);
    }
}

// Refactored renderPage to use unified control creation and callback
function renderPage(rootDiv: HTMLElement | null) {
    if (!rootDiv) {
        console.error("Root element not found.");
        return;
    }
    
    // Set flag to prevent recursive calls
    if (isRendering) {
        console.warn("renderPage called recursively, skipping");
        return;
    }
    isRendering = true;
    
    try {

    // Clear dynamically created controls to prevent duplication when re-rendering
    // Keep only: ratioTableContainer, chart containers, and hideAllButton
    const elementsToKeep = [
        'ratioTableContainer',
        'czechDataContainer',
        'euDataContainer',
        'deWastewaterContainer',
        'nlInfectieradarContainer',
        'hideAllButton'
    ];
    
    // Remove all child elements that are not in the keep list
    Array.from(rootDiv.children).forEach(child => {
        if (child.id && !elementsToKeep.includes(child.id)) {
            child.remove();
        } else if (!child.id) {
            // Remove elements without IDs (labels, inputs created dynamically)
            child.remove();
        }
    });
    
    // Also clear country and survtype selectors from chart containers
    chartConfigs.forEach(cfg => {
        const container = document.getElementById(cfg.containerId);
        if (container) {
            const countrySelectorId = `${cfg.containerId}-country-selector`;
            const survtypeSelectorId = `${cfg.containerId}-survtype-selector`;
            const existingCountrySelector = document.getElementById(countrySelectorId);
            const existingSurvtypeSelector = document.getElementById(survtypeSelectorId);
            if (existingCountrySelector) {
                existingCountrySelector.remove();
            }
            if (existingSurvtypeSelector) {
                existingSurvtypeSelector.remove();
            }
        }
    });

    // Migrate old settings if needed
    migrateOldSettings();

    // Check for URL state and apply it if present
    const urlState = loadStateFromUrl();
    let appSettings: AppSettings;
    let countryFilters: Map<string, string>;
    let survtypeFilters: Map<string, string>;
    
    if (urlState) {
        // Apply state from URL
        const applied = applyUrlState(urlState, chartConfigs);
        appSettings = applied.appSettings;
        countryFilters = applied.countryFilters;
        
        // Initialize survtype filters from localStorage (URL state support can be added later)
        survtypeFilters = new Map<string, string>();
        chartConfigs.forEach(cfg => {
            if (cfg.hasSurvtypeFilter && cfg.survtypeFilterKey) {
                survtypeFilters.set(cfg.containerId, loadSurvtypeFilter(cfg.survtypeFilterKey));
            }
        });
        
        // Update language select element if language was restored from URL
        if (urlState.language) {
            const newLang = getLanguage();  // Get the language that was just set
            if (languageSelect) {
                languageSelect.value = newLang;
            }
            currentLanguage = newLang;
            translations = getTranslations(newLang);
            // Update all UI texts with the new language
            updateAllUITexts();
        }
    } else {
        // Load from localStorage
        appSettings = loadAppSettings();
        countryFilters = new Map<string, string>();
        survtypeFilters = new Map<string, string>();
        chartConfigs.forEach(cfg => {
            if (cfg.hasCountryFilter && cfg.countryFilterKey) {
                countryFilters.set(cfg.containerId, loadCountryFilter(cfg.countryFilterKey));
            }
            if (cfg.hasSurvtypeFilter && cfg.survtypeFilterKey) {
                survtypeFilters.set(cfg.containerId, loadSurvtypeFilter(cfg.survtypeFilterKey));
            }
        });
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

    // Unified callback for settings changes
    function onSettingsChange(key?: keyof AppSettings, value?: AppSettings[keyof AppSettings]) {
        if (key && value !== undefined) {
            (appSettings as any)[key] = value;
            saveAppSettings(appSettings);
        }
                
        chartConfigs.forEach(cfg => {
            if ((cfg as any).canvas) {
                const countryFilter = cfg.hasCountryFilter ? countryFilters.get(cfg.containerId) : undefined;
                const survtypeFilter = cfg.hasSurvtypeFilter ? survtypeFilters.get(cfg.containerId) : undefined;
                cfg.chartHolder.chart = updateChart(
                    appSettings.timeRange,
                    cfg,
                    appSettings.includeFuture,
                    appSettings.showExtremes,
                    appSettings.showShifted,
                    appSettings.showTestNumbers,
                    appSettings.showShiftedTestNumbers,
                    appSettings.showNonAveragedSeries,
                    appSettings.shiftOverride,
                    appSettings.alignByExtreme,
                    countryFilter,
                    survtypeFilter
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
            { value: "30", label: translations.timeRangeLastMonth },
            { value: "90", label: translations.timeRangeLast90Days },
            { value: "180", label: translations.timeRangeLast180Days },
            { value: "365", label: translations.timeRangeLastYear },
            { value: `${365*2}`, label: translations.timeRangeLast2Years },
            { value: "all", label: translations.timeRangeAllTime },
        ],
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'includeFutureCheckbox',
        label: translations.includeFutureData,
        container: rootDiv,
        settingKey: 'includeFuture',
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'showExtremesCheckbox',
        label: translations.showMinMaxSeries,
        container: rootDiv,
        settingKey: 'showExtremes',
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'showShiftedCheckbox',
        label: translations.showShiftedSeries,
        container: rootDiv,
        settingKey: 'showShifted',
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'showTestNumbersCheckbox',
        label: translations.showTestNumbers,
        container: rootDiv,
        settingKey: 'showTestNumbers',
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'showShiftedTestNumbersCheckbox',
        label: translations.showShiftedTestNumbers,
        container: rootDiv,
        settingKey: 'showShiftedTestNumbers',
        settings: appSettings,
        onChange: onSettingsChange
    });

    createUnifiedSettingsControl({
        type: 'checkbox',
        id: 'showNonAveragedSeriesCheckbox',
        label: translations.showNonAveragedSeries,
        container: rootDiv,
        settingKey: 'showNonAveragedSeries',
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
    shiftDaysLabel.textContent = translations.shiftBy;
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
            { value: 'days', label: translations.shiftByDays },
            { value: 'maxima', label: translations.shiftByMaxima },
            { value: 'minima', label: translations.shiftByMinima }
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
    
    // Create survtype selectors for charts that have them
    chartConfigs.forEach(cfg => {
        if (cfg.hasSurvtypeFilter && cfg.survtypeFilterKey) {
            createSurvtypeSelector(cfg, survtypeFilters, onSettingsChange);
        }
    });

    // Initial render
    onSettingsChange();

    // Attach event listener to hide all button
    const hideAllButton = document.getElementById('hideAllButton');
    if (hideAllButton) {
        hideAllButton.addEventListener('click', () => hideAllSeries(() => onSettingsChange()));
    }
    
    // Create and attach "Get Link" functionality
    createGetLinkButton(appSettings, chartConfigs, countryFilters);
    
    // Setup global click handler to close tooltips when clicking outside charts
    // This is especially important for Safari/iOS where tooltips can get stuck
    setupTooltipDismissHandler(chartConfigs);
    
    } finally {
        // Clear flag to allow future renders
        isRendering = false;
    }
}

function createGetLinkButton(appSettings: AppSettings, chartConfigs: ChartConfig[], countryFilters: Map<string, string>) {
    const getLinkElement = document.getElementById('getLinkButton');
    if (!getLinkElement) {
        console.error("Get Link button not found");
        return;
    }
    
    getLinkElement.addEventListener('click', () => {
        // Encode current state
        const encoded = encodeUrlState(appSettings, chartConfigs, countryFilters);
        
        // Create URL with state parameter
        const url = new URL(window.location.href);
        url.search = ''; // Clear existing query params
        url.searchParams.set('state', encoded);
        
        // Copy to clipboard
        navigator.clipboard.writeText(url.toString()).then(() => {
            // Show feedback to user
            const originalText = getLinkElement.textContent;
            getLinkElement.textContent = 'Link Copied!';
            getLinkElement.style.color = '#2ca02c';
            
            setTimeout(() => {
                getLinkElement.textContent = originalText;
                getLinkElement.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy link:', err);
            // Fallback: show the link in an alert
            alert('Copy this link:\n\n' + url.toString());
        });
    });
}

/**
 * Sets up a global event handler to dismiss chart tooltips when clicking outside chart areas.
 * This is particularly important for Safari/iOS where tooltips can remain visible after tapping.
 * 
 * @param chartConfigs - Array of chart configurations containing the chart instances
 */
function setupTooltipDismissHandler(chartConfigs: ChartConfig[]): void {
    // Handler function to close tooltips when clicking outside charts
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        // Get the target element
        const target = event.target as HTMLElement;
        
        // Check if click was on a canvas element (a chart)
        const isCanvasClick = target.tagName === 'CANVAS';
        
        // If the click was not on a canvas, hide all tooltips
        if (!isCanvasClick) {
            chartConfigs.forEach(cfg => {
                const chart = cfg.chartHolder.chart;
                if (chart) {
                    // Set tooltip to inactive by clearing active elements
                    chart.setActiveElements([]);
                    chart.update('none'); // Update without animation for immediate response
                }
            });
        }
    };
    
    // Add listeners for both click and touchend events
    // touchend is important for iOS/Safari to handle tap gestures
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchend', handleClickOutside);
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

function filterDataBySurvtype(data: TimeseriesData, survtype: string): TimeseriesData {
    // "both" means show all survtypes
    if (survtype === "both") {
        return data;
    }
    return {
        dates: data.dates,
        series: data.series.filter(series => {
            // If series doesn't have survtype metadata, include it
            if (!series.survtype) {
                return true;
            }
            return series.survtype === survtype;
        })
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

function loadSurvtypeFilter(key: string): string {
    try {
        const stored = localStorage.getItem(key);
        return stored || "both";
    } catch (error) {
        console.error("Error loading survtype filter:", error);
        return "both";
    }
}

function saveSurvtypeFilter(key: string, survtype: string): void {
    try {
        localStorage.setItem(key, survtype);
    } catch (error) {
        console.error("Error saving survtype filter:", error);
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

function updateChart(timeRange: string, cfg: ChartConfig, includeFuture: boolean = true, showExtremes: boolean = false, showShifted: boolean = true, showTestNumbers: boolean = true, showShiftedTestNumbers: boolean = false, showNonAveragedSeries: boolean = false, shiftOverride: number | null = null, alignByExtreme: AlignByExtreme = 'maxima', countryFilter?: string, survtypeFilter?: string) {
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
    
    // Apply survtype filter if applicable
    if (survtypeFilter && cfg.hasSurvtypeFilter) {
        data = filterDataBySurvtype(data, survtypeFilter);
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
        // Negate the value so positive inputs shift backward (show past data)
        const shiftDays = -(shiftOverride ?? 0);
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
    } else {
        // When includeFuture is true, show 2x the past time range as future
        // For "all" time range, show all available future data
        if (timeRange !== "all") {
            const days = parseInt(timeRange);
            const futureCutoffDate = new Date();
            futureCutoffDate.setDate(futureCutoffDate.getDate() + (2 * days));
            const futureCutoffString = futureCutoffDate.toISOString().split('T')[0];
            const futureIdx = data.dates.findIndex(d => d > futureCutoffString);
            if (futureIdx >= 0) endIdx = futureIdx;
        }
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
        ["#9467bd", "#a569d4", "#b86beb", "#cb8dff", "#deadff"],
        // Oranges palette
        ["#ff7f0e", "#ff9933", "#ffad5c", "#ffc285", "#ffd6ae"],
        // Browns palette
        ["#8b4513", "#a0522d", "#b8734d", "#cd9575", "#e4b89d"],
        // Pinks palette
        ["#e377c2", "#f48fb1", "#f7a8cc", "#fabfe6", "#fdd7f0"],
        // Grays palette
        ["#7f7f7f", "#969696", "#adadad", "#c4c4c4", "#dbdbdb"]
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

    // Create stable palette mapping for consistent colors across alignment modes
    const paletteMap = createStablePaletteMapping(data.series, colorPalettes.length);

    let datasets = generateNormalDatasets(sortedSeriesWithIndices, cfg, numberOfRawData, colorPalettes, data, startIdx, endIdx, paletteMap);
    let barDatasets = generateTestNumberBarDatasets(sortedSeriesWithIndices, cfg, numberOfRawData, colorPalettes, data, startIdx, endIdx, paletteMap, showShifted, showShiftedTestNumbers);

    // Filter shifted series based on showShifted setting
    if (!showShifted) {
        datasets = datasets.filter(ds => !isShiftedSeries(ds.label));
    }

    // Filter non-averaged (raw) series based on showNonAveragedSeries setting
    if (!showNonAveragedSeries) {
        // Find the corresponding series for each dataset and filter by type
        datasets = datasets.filter(ds => {
            const normalizedLabel = normalizeSeriesName(ds.label);
            // Find the series in sortedSeriesWithIndices that matches this dataset
            const matchingSeries = sortedSeriesWithIndices.find(({series}) => {
                const translatedName = translateSeriesName(series.name);
                return translatedName === ds.label || normalizeSeriesName(series.name) === normalizedLabel;
            });
            // Keep the dataset if it's averaged or if we couldn't find the series (safety)
            return !matchingSeries || matchingSeries.series.type !== 'raw';
        });
    }

    // Filter test number series based on showTestNumbers setting
    if (!showTestNumbers) {
        barDatasets = barDatasets.filter(ds => !isTestNumberSeries(ds.label));
    }

    // Filter shifted test number series based on showShiftedTestNumbers setting
    // Only apply if the general filters haven't already removed them
    if (!showShiftedTestNumbers) {
        barDatasets = barDatasets.filter(ds => {
            // Filter out datasets that are both test numbers AND shifted
            return !isShiftedTestNumberSeries(ds.label);
        });
    }

    const localExtremeDatasets = [
        ...generateLocalExtremeDataset([filteredMaximaSeries], data, cutoffDateString, "red", includeFuture, cfg), 
        ...generateLocalExtremeDataset([filteredMinimaSeries], data, cutoffDateString, "blue", includeFuture, cfg)
    ];

    // Build list of valid series names from all datasets (now includes extreme series always)
    const allDatasetsWithExtremes = [...datasets, ...barDatasets, ...localExtremeDatasets];
    const validSeriesNames = new Set<string>(allDatasetsWithExtremes.map(ds => ds.label));
    
    // Normalize all series names to English for storage
    const normalizedValidNames = new Set<string>();
    const displayToNormalizedMap = new Map<string, string>();
    validSeriesNames.forEach(seriesName => {
        const normalized = normalizeSeriesName(seriesName);
        normalizedValidNames.add(normalized);
        displayToNormalizedMap.set(seriesName, normalized);
    });
    
    // Build a map of base series names to current series names for preserving visibility
    const baseToCurrentSeriesMap = new Map<string, string>();
    normalizedValidNames.forEach(normalizedName => {
        const baseName = getBaseSeriesName(normalizedName);
        baseToCurrentSeriesMap.set(baseName, normalizedName);
    });
    
    // Build a map from normalized series name to series type for getVisibilityDefault
    const normalizedNameToType = new Map<string, 'raw' | 'averaged'>();
    sortedSeriesWithIndices.forEach(({series}) => {
        const normalizedName = normalizeSeriesName(series.name);
        normalizedNameToType.set(normalizedName, series.type);
    });
    
    // Initialize visibility for new series, checking both exact name and base name for previous state
    // Always use normalized (English) names for storage
    // Check if we have any stored visibility (from URL or previous session)
    // When survtype filter is active, don't treat stored visibility as authoritative
    // because the set of available series changes when survtype changes
    const hasSurvtypeFilter = cfg.hasSurvtypeFilter && survtypeFilter;
    const hasStoredVisibility = !hasSurvtypeFilter && Object.keys(cfg.datasetVisibility).length > 0;
    
    normalizedValidNames.forEach(normalizedName => {
        if (cfg.datasetVisibility[normalizedName] === undefined) {
            // Check if we have visibility state for the base series name (from a different shift)
            const baseName = getBaseSeriesName(normalizedName);
            const previousVisibility = Object.keys(cfg.datasetVisibility).find(key => {
                return getBaseSeriesName(key) === baseName;
            });
            
            if (previousVisibility !== undefined) {
                // Preserve visibility from previous shift of the same series
                // BUT: Always respect current filter settings - defaultState tells us what filters allow
                const previousState = cfg.datasetVisibility[previousVisibility];
                const seriesType = normalizedNameToType.get(normalizedName);
                const defaultState = getVisibilityDefault(normalizedName, showShifted, showTestNumbers, showShiftedTestNumbers, showNonAveragedSeries, seriesType);
                // If filters say it should be hidden (defaultState is false), hide it regardless of previous state
                // If filters allow it (defaultState is true), preserve the previous user choice
                cfg.datasetVisibility[normalizedName] = defaultState === false ? false : previousState;
            } else {
                // If we have stored visibility (from URL or localStorage), missing entries should be false
                // Otherwise, use the default visibility for first-time load
                if (hasStoredVisibility) {
                    cfg.datasetVisibility[normalizedName] = false;
                } else {
                    const seriesType = normalizedNameToType.get(normalizedName);
                    cfg.datasetVisibility[normalizedName] = getVisibilityDefault(normalizedName, showShifted, showTestNumbers, showShiftedTestNumbers, showNonAveragedSeries, seriesType);
                }
            }
        }
        
        // Also initialize visibility for test number bar variations (Positive Tests / Negative Tests)
        // These are created dynamically from positivity series but need their own visibility entries
        const positiveTestsName = `${normalizedName} - Positive Tests`;
        const negativeTestsName = `${normalizedName} - Negative Tests`;
        
        if (cfg.datasetVisibility[positiveTestsName] === undefined) {
            if (hasStoredVisibility) {
                cfg.datasetVisibility[positiveTestsName] = false;
            } else {
                cfg.datasetVisibility[positiveTestsName] = getVisibilityDefault(positiveTestsName, showShifted, showTestNumbers, showShiftedTestNumbers, showNonAveragedSeries);
            }
        }
        if (cfg.datasetVisibility[negativeTestsName] === undefined) {
            if (hasStoredVisibility) {
                cfg.datasetVisibility[negativeTestsName] = false;
            } else {
                cfg.datasetVisibility[negativeTestsName] = getVisibilityDefault(negativeTestsName, showShifted, showTestNumbers, showShiftedTestNumbers, showNonAveragedSeries);
            }
        }
    });
    
    // Clean up visibility state for series that no longer exist
    // This prevents localStorage from growing indefinitely with old shift values
    Object.keys(cfg.datasetVisibility).forEach(storedName => {
        if (!normalizedValidNames.has(storedName)) {
            // Remove entries that are not in the current valid series list
            // The visibility state has already been transferred to new series above
            console.log(`Removing visibility for non-existing series: ${storedName}`);
            delete cfg.datasetVisibility[storedName];
        }
    });
    localStorage.setItem(cfg.visibilityKey, JSON.stringify(cfg.datasetVisibility));

    if (showExtremes) {
        datasets.push(...localExtremeDatasets);
    }
    const allVisibleDatasets = [...datasets, ...barDatasets];
    allVisibleDatasets.forEach(dataset => {
        // Normalize the label to English for looking up visibility
        const normalizedLabel = normalizeSeriesName(dataset.label);
        dataset.hidden = !cfg.datasetVisibility[normalizedLabel];
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
                    itemSort: function(a: any, b: any) {
                        // Use direct comparison function for pairwise sorting
                        return compareTooltipItems(a as TooltipItem, b as TooltipItem);
                    },
                    callbacks: {
                        label: function(context: any) {
                            // Get the label and value
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            
                            // Format the value based on series type
                            let formattedValue: string;
                            if (isNaN(value)) {
                                formattedValue = 'N/A';
                            } else if (isScalarSeries(context.dataset)) {
                                // For scalar series (e.g., wastewater), use scientific notation
                                formattedValue = value.toExponential(3);
                            } else {
                                // For positivity data, show as decimal (values are percentages like 5.123 meaning 5.123%)
                                formattedValue = value.toFixed(3);
                            }
                            
                            return `${label}: ${formattedValue}`;
                        },
                        title: function(context) {
                            if (context.length === 0) return '';
                            
                            // Get the current date being hovered over
                            const currentDate = context[0].label;
                            
                            // Check if any visible shifted series exist
                            const hasVisibleShiftedSeries = context.some(item => {
                                const label = item.dataset.label || '';
                                const isVisible = !item.dataset.hidden;
                                return isShiftedSeries(label) && isVisible;
                            });
                            
                            if (!hasVisibleShiftedSeries) {
                                // No shifted series visible, show only current date
                                return currentDate;
                            }
                            
                            // Find the shift amount from any shifted series
                            // All shifted series in the same chart should have the same shift
                            let shiftDays: number | null = null;
                            for (const item of context) {
                                const label = item.dataset.label || '';
                                if (isShiftedSeries(label)) {
                                    const shiftInfo = extractShiftFromLabel(label);
                                    if (shiftInfo !== null) {
                                        shiftDays = shiftInfo;
                                        break;
                                    }
                                }
                            }
                            
                            if (shiftDays === null) {
                                // Couldn't extract shift, show only current date
                                return currentDate;
                            }
                            
                            // Calculate the original date
                            // The shift is applied as: shiftedValues[i] = originalValues[i + shiftByIndexes]
                            // So if we're at currentDate (after shift), the original date is: currentDate + shiftDays
                            const date = new Date(currentDate);
                            const originalDate = new Date(date);
                            originalDate.setDate(originalDate.getDate() + shiftDays);
                            const originalDateString = originalDate.toISOString().split('T')[0];
                            
                            // Return both dates
                            return [
                                `Date: ${currentDate}`,
                                `Shifted Original: ${originalDateString} (${shiftDays > 0 ? '+' : ''}${shiftDays}d)`
                            ];
                        }
                    }
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
                                const hasScalarSeries = cfg.data.series.some(s => isScalarSeries(s));
                                if (hasScalarSeries) {
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
    
    // Group datasets by base name for test pairs
    // Track which datasets have been processed to avoid duplicates
    const processedIndices = new Set<number>();
    
    // Create legend items for each dataset in sorted order
    datasetsWithIndices.forEach(({ dataset, index }) => {
        if (processedIndices.has(index)) {
            return; // Skip already processed datasets
        }
        
        const datasetLabel = dataset.label || `Dataset ${index}`;
        
        // Check if this is a test dataset (positive or negative)
        const isPositiveTest = isPositiveTestSeries(datasetLabel);
        const isNegativeTest = isNegativeTestSeries(datasetLabel);
        
        if (isPositiveTest) {
            // Find the corresponding negative test dataset
            const baseSeriesName = getTestPairBaseName(datasetLabel);
            const negativeLabel = `${baseSeriesName} - Negative Tests`;
            
            // Find the negative test dataset
            const negativeDataset = datasetsWithIndices.find(d => {
                const label = normalizeSeriesName(d.dataset.label || '');
                return label === negativeLabel;
            });
            
            if (negativeDataset) {
                // Create a split pill for both positive and negative tests
                createSplitTestPill(
                    legendContainer,
                    chart,
                    cfg,
                    dataset,
                    index,
                    negativeDataset.dataset,
                    negativeDataset.index,
                    baseSeriesName,
                    updateRatioTable
                );
                
                processedIndices.add(index);
                processedIndices.add(negativeDataset.index);
            } else {
                // If no negative pair found, create regular button
                createRegularLegendButton(legendContainer, chart, cfg, dataset, index, updateRatioTable);
                processedIndices.add(index);
            }
        } else if (isNegativeTest) {
            // Check if this negative test has a corresponding positive test
            const baseSeriesName = getTestPairBaseName(datasetLabel);
            const positiveLabel = `${baseSeriesName} - Positive Tests`;
            
            // Find the positive test dataset
            const positiveDataset = datasetsWithIndices.find(d => {
                const label = normalizeSeriesName(d.dataset.label || '');
                return label === positiveLabel;
            });
            
            if (positiveDataset) {
                // Create a split pill for both positive and negative tests
                // (positive is first in the pill)
                createSplitTestPill(
                    legendContainer,
                    chart,
                    cfg,
                    positiveDataset.dataset,
                    positiveDataset.index,
                    dataset,
                    index,
                    baseSeriesName,
                    updateRatioTable
                );
                
                processedIndices.add(positiveDataset.index);
                processedIndices.add(index);
            } else {
                // If no positive pair found, create regular button
                createRegularLegendButton(legendContainer, chart, cfg, dataset, index, updateRatioTable);
                processedIndices.add(index);
            }
        } else {
            // Check if this is a shifted series that has a corresponding base series
            const normalizedLabel = normalizeSeriesName(datasetLabel);
            const shifted = isShiftedSeries(datasetLabel);
            
            if (shifted) {
                // Extract base series name (without shift suffix)
                const baseNameWithoutShift = getBaseSeriesNameWithoutShift(normalizedLabel);
                
                // Find the corresponding base series dataset
                const baseDataset = datasetsWithIndices.find(d => {
                    const label = normalizeSeriesName(d.dataset.label || '');
                    // Match if it's the same base series but not shifted
                    return label === baseNameWithoutShift && !isShiftedSeries(d.dataset.label || '');
                });
                
                if (baseDataset) {
                    // Create a split pill for base and shifted series
                    createSplitShiftedPill(
                        legendContainer,
                        chart,
                        cfg,
                        baseDataset.dataset,
                        baseDataset.index,
                        dataset,
                        index,
                        baseNameWithoutShift,
                        updateRatioTable
                    );
                    
                    processedIndices.add(baseDataset.index);
                    processedIndices.add(index);
                } else {
                    // No base series found, create regular button
                    createRegularLegendButton(legendContainer, chart, cfg, dataset, index, updateRatioTable);
                    processedIndices.add(index);
                }
            } else {
                // Check if this base series has a corresponding shifted variant
                const shiftedLabel = datasetsWithIndices.find(d => {
                    const label = normalizeSeriesName(d.dataset.label || '');
                    // Match if it's shifted and has the same base name
                    if (!isShiftedSeries(d.dataset.label || '')) {
                        return false;
                    }
                    const shiftedBaseName = getBaseSeriesNameWithoutShift(label);
                    return shiftedBaseName === normalizedLabel;
                });
                
                if (shiftedLabel) {
                    // Create a split pill for base and shifted series
                    createSplitShiftedPill(
                        legendContainer,
                        chart,
                        cfg,
                        dataset,
                        index,
                        shiftedLabel.dataset,
                        shiftedLabel.index,
                        normalizedLabel,
                        updateRatioTable
                    );
                    
                    processedIndices.add(index);
                    processedIndices.add(shiftedLabel.index);
                } else {
                    // No shifted variant found, create regular button
                    createRegularLegendButton(legendContainer, chart, cfg, dataset, index, updateRatioTable);
                    processedIndices.add(index);
                }
            }
        }
    });
}

/**
 * Creates a stable palette mapping for base series names.
 * Each base series is assigned to a palette, and different variations (raw, averaged, shifted)
 * get different colors within that palette.
 * 
 * Priority assignments ensure consistent colors:
 * - Antigen: Blues palette (index 0) - Czech data
 * - PCR: Greens palette (index 1) - Czech data
 * - SARS-CoV-2: Reds palette (index 2) - all data sources
 * - RSV: Blues palette (index 0) - EU/NL/DE data sources
 * - Influenza: Greens palette (index 1) - EU/NL/DE data sources
 * - Netherlands-specific pathogens: Each gets unique color family (Purples, Oranges, Browns, Pinks, Grays)
 * 
 * @param series - Array of all series in the dataset
 * @param numPalettes - Number of available color palettes
 * @returns A map from base series name to palette index
 */
function createStablePaletteMapping(series: DataSeries[], numPalettes: number): Map<string, number> {
    const paletteMap = new Map<string, number>();
    
    // Extract unique base series names and sort them for stability
    const uniqueBaseNames = Array.from(
        new Set(series.map(s => getColorBaseSeriesName(s.name)))
    ).sort((a, b) => compareLabels(a, b));
    
    // Priority mappings to ensure consistent and distinct colors
    // Palette indices: [0: Blues, 1: Greens, 2: Reds, 3: Purples, 4: Oranges, 5: Browns, 6: Pinks, 7: Grays]
    const priorityMappings: Record<string, number> = {
        // Czech MZCR data - preserve original alphabetical assignment
        'Antigen Positivity': 0,                  // Blues (first alphabetically)
        'PCR Positivity': 1,                      // Greens (second alphabetically)
        
        // SARS-CoV-2 across all sources - always Red
        'SARS-CoV-2 Positivity': 2,               // Reds
        'SARS-CoV-2 Wastewater': 2,               // Reds
        
        // Standard respiratory viruses across EU/NL/DE
        'RSV Positivity': 0,                      // Blues
        'RSV Wastewater': 0,                      // Blues
        'Influenza Positivity': 1,                // Greens
        'Influenza Wastewater': 1,                // Greens
        
        // Netherlands-specific pathogens - each gets unique color family
        'Adenovirus Positivity': 3,               // Purples
        'Humaan metapneumovirus Positivity': 4,   // Oranges (unique, distinct from Adenovirus)
        'Parainfluenza Positivity': 5,            // Browns (unique, distinct from RSV Blues)
        'Rhino-/enterovirus Positivity': 6,       // Pinks (unique, distinct from Influenza Greens)
        'Seizoenscoronavirussen Positivity': 7,   // Grays (unique, distinct from SARS-CoV-2 Reds)
    };
    
    // Check for priority series and assign them first
    const priorityNames = new Set<string>();
    uniqueBaseNames.forEach(baseName => {
        if (baseName in priorityMappings) {
            paletteMap.set(baseName, priorityMappings[baseName]);
            priorityNames.add(baseName);
        }
    });
    
    // Assign remaining series to available palettes in round-robin fashion
    const remainingNames = uniqueBaseNames.filter(name => !priorityNames.has(name));
    remainingNames.forEach((baseName, index) => {
        const paletteIndex = index % numPalettes;
        paletteMap.set(baseName, paletteIndex);
    });
    
    return paletteMap;
}

/**
 * Determines the color index within a palette based on series characteristics.
 * This ensures different subtypes (raw, averaged, shifted) get different colors
 * within the same palette.
 * 
 * @param series - The series to determine color index for
 * @returns The color index (0-4) within the palette
 */
function getSeriesColorIndex(series: DataSeries): number {
    // Averaged series (non-shifted): use darkest color as the base (index 0)
    if (series.type === 'averaged') {
        // If shifted, use lighter color (index 2)
        if (series.shiftedByIndexes !== undefined && series.shiftedByIndexes !== 0) {
            return 2;
        }
        // Non-shifted averaged: use darkest color (index 0)
        return 0;
    }
    
    // Raw series: use slightly lighter color than averaged (index 1)
    if (series.type === 'raw') {
        return 1;
    }
    
    // Default fallback
    return 0;
}

function generateNormalDatasets(sortedSeriesWithIndices: { series: DataSeries; originalIndex: number; }[], cfg: ChartConfig, numberOfRawData: number, colorPalettes: string[][], data: TimeseriesData, startIdx: number, endIdx: number, paletteMap: Map<string, number>) {
    return sortedSeriesWithIndices.map(({ series, originalIndex }, sortedIndex) => {
        // Use stable palette mapping based on base series name
        const baseName = getColorBaseSeriesName(series.name);
        const paletteIndex = paletteMap.get(baseName) ?? 0;
        const colorIndex = getSeriesColorIndex(series);
        const selectedPalette = colorPalettes[paletteIndex % colorPalettes.length];
        const borderColor = selectedPalette[colorIndex % selectedPalette.length];

        // Validate data based on type
        if (!isScalarSeries(series)) {
            series.values.forEach((element, i: number) => {
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
        if (isScalarSeries(series)) {
            // For scalar series, use the value directly (no percentage conversion)
            chartData = series.values.slice(startIdx, endIdx).map((dp) => {
                if (!dp) return 0;
                return dp.virusLoad || 0;
            });
        } else {
            // For positivity data, convert to percentage
            chartData = series.values.slice(startIdx, endIdx).map(datapointToPercentage);
        }
        
        // Determine line style: dashed for shifted series, solid for others
        const isShifted = series.shiftedByIndexes !== undefined && series.shiftedByIndexes !== 0;
        const borderDash = isShifted ? SHIFTED_LINE_DASH_PATTERN : undefined;
        
        return {
            label: translateSeriesName(series.name),
            data: chartData,
            borderColor: borderColor,
            borderDash: borderDash,
            fill: false,
            hidden: false,
            borderWidth: 1,
            pointRadius: 0,
        };
    });
}

function generateTestNumberBarDatasets(
    sortedSeriesWithIndices: { series: DataSeries; originalIndex: number; }[], 
    cfg: ChartConfig, 
    numberOfRawData: number, 
    colorPalettes: string[][], 
    data: TimeseriesData, 
    startIdx: number, 
    endIdx: number, 
    paletteMap: Map<string, number>,
    showShifted: boolean,
    showShiftedTestNumbers: boolean
) {
    // Only generate bar charts for raw positivity series (not averaged, not scalar)
    let rawPositivitySeriesWithIndices = sortedSeriesWithIndices.filter(({ series }) => 
        series.type === 'raw' && !isScalarSeries(series)
    );
    
    // Filter out shifted series if showShifted is false or showShiftedTestNumbers is false
    // We need to check the series name BEFORE creating test number datasets
    if (!showShifted || !showShiftedTestNumbers) {
        rawPositivitySeriesWithIndices = rawPositivitySeriesWithIndices.filter(({ series }) => {
            const shifted = isShiftedSeries(series.name);
            
            // If shifted series are completely disabled, filter out all shifted series
            if (!showShifted && shifted) {
                return false;
            }
            
            // If shifted test numbers are disabled (but regular shifted might be ok),
            // filter out shifted series since they will become test number bars
            if (!showShiftedTestNumbers && shifted) {
                return false;
            }
            
            return true;
        });
    }
    
    return rawPositivitySeriesWithIndices.flatMap(({ series, originalIndex }, sortedIndex) => {
        // Use stable palette mapping based on base series name
        const baseName = getColorBaseSeriesName(series.name);
        const paletteIndex = paletteMap.get(baseName) ?? 0;
        const selectedPalette = colorPalettes[paletteIndex % colorPalettes.length];
        
        // For test bars, use first two colors from the palette (with bounds checking)
        // Positive tests use the base color (index 0), negative tests use slightly lighter (index 1)
        const basePositiveColor = selectedPalette[0 % selectedPalette.length];
        const baseNegativeColor = selectedPalette[Math.min(1, selectedPalette.length - 1)];

        // Adjust colors: reduce saturation and increase contrast
        const positiveColor = adjustColorForTestBars(basePositiveColor, true);
        const negativeColor = adjustColorForTestBars(baseNegativeColor, false);

        const positiveData = (series as PositivitySeries).values.slice(startIdx, endIdx).map((dp: any) => dp.positive);
        const negativeData = (series as PositivitySeries).values.slice(startIdx, endIdx).map((dp: any) => dp.tests - dp.positive);

        return [
            {
                label: translateSeriesName(`${series.name} - Positive Tests`),
                data: positiveData,
                backgroundColor: positiveColor,
                borderColor: positiveColor,
                type: 'bar' as const,
                yAxisID: 'y1',
                stack: `stack-${series.name}`,
                hidden: false,
            },
            {
                label: translateSeriesName(`${series.name} - Negative Tests`),
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
            label: translateSeriesName(extrSeries.name),
            data: extrSeries.indices.map(index => {
                let yValue: number;
                if (originalSeries && isScalarSeries(originalSeries)) {
                    yValue = originalSeries.values[index]?.virusLoad ?? 0;
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
            
            // Normalize the series name to English for visibility check
            // Raw data series names are in English, so normalize them for consistency
            const normalizedSeriesName = normalizeSeriesName(series.name);
            
            // Check if any key in datasetVisibility contains this series name and has a true value
            return Object.entries(cfg.datasetVisibility).some(([key, isVisible]) => {
                return key.includes(normalizedSeriesName) && isVisible;
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
        ratioTableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 8px; border: 1px solid #ddd;">${translations.trendsNoDataAvailable}</td></tr>`;
        return;
    }
    
    // Calculate ratios for all datasets
    const allRatios: RatioData[] = [];
    visiblePerChart.forEach(([cfg, seriesNames]) => {
        const ratios = calculateRatios(cfg.data, seriesNames);
        ratios.forEach(ratio => {
            const daysSinceLastData = (new Date().getTime() - (ratio.lastDataDate ?? new Date()).getTime()) / (1000 * 60 * 60 * 24);
            const translatedSeriesName = translateSeriesName(ratio.seriesName);
            ratio.seriesName =  `${translatedSeriesName} - ${cfg.shortTitle} (last: -${Math.ceil(daysSinceLastData)}d)`; 
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
        { label: `${translations.trendsPeriod7d}<br><small>${translations.trendsPeriod7dSub}</small>`, getValue: (ratio: RatioData) => ratio.ratio7days },
        { label: `${translations.trendsPeriod28d}<br><small>${translations.trendsPeriod28dSub}</small>`, getValue: (ratio: RatioData) => ratio.ratio28days }
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

// Expose chart configs for E2E testing
(window as any).__chartConfigs = chartConfigs;

