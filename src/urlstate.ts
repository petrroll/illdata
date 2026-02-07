// URL state management
// Extracted from main.ts for testability and reuse

import { type AppSettings, DEFAULT_APP_SETTINGS, saveAppSettings } from './settings';
import { getLanguage, setLanguage, type Language } from './locales';

export interface UrlState {
    settings: AppSettings;
    visibility: {
        [key: string]: { [seriesName: string]: boolean };
    };
    countryFilters: {
        [key: string]: string;
    };
    survtypeFilters?: {
        [key: string]: string;
    };
    language?: string; // Optional for backward compatibility
}

export interface UrlChartConfig {
    containerId: string;
    visibilityKey: string;
    datasetVisibility: { [key: string]: boolean };
    countryFilterKey?: string;
}

export function encodeUrlState(appSettings: AppSettings, chartConfigs: UrlChartConfig[], countryFilters: Map<string, string>): string {
    // Collect visibility state from all charts, storing only 'true' values to reduce size
    const compactVisibility: { [key: string]: { [seriesName: string]: boolean } } = {};
    chartConfigs.forEach(cfg => {
        const trueOnly: { [seriesName: string]: boolean } = {};
        Object.entries(cfg.datasetVisibility).forEach(([seriesName, isVisible]) => {
            if (isVisible === true) {
                trueOnly[seriesName] = true;
            }
        });
        if (Object.keys(trueOnly).length > 0) {
            compactVisibility[cfg.visibilityKey] = trueOnly;
        }
    });
    
    // Collect country filters
    const compactCountryFilters: { [key: string]: string } = {};
    countryFilters.forEach((country, containerId) => {
        const cfg = chartConfigs.find(c => c.containerId === containerId);
        if (cfg && cfg.countryFilterKey) {
            compactCountryFilters[cfg.countryFilterKey] = country;
        }
    });
    
    // Use short keys to minimize URL length
    const compactState = {
        s: appSettings,
        v: compactVisibility,
        c: compactCountryFilters,
        l: getLanguage() // Include current language in shared link
    };
    
    // Encode state to base64 URL parameter
    const jsonStr = JSON.stringify(compactState);
    const base64 = btoa(jsonStr);
    return base64;
}

export function decodeUrlState(encoded: string): UrlState | null {
    try {
        const jsonStr = atob(encoded);
        const parsed = JSON.parse(jsonStr) as any;
        
        // Handle both compact format (new) and full format (old) for backward compatibility
        let state: UrlState;
        if ('s' in parsed || 'v' in parsed || 'c' in parsed || 'l' in parsed) {
            // New compact format with short keys
            state = {
                settings: parsed.s || {},
                visibility: parsed.v || {},
                countryFilters: parsed.c || {},
                language: parsed.l
            };
        } else {
            // Old format with full keys
            state = parsed as UrlState;
        }
        
        return state;
    } catch (error) {
        console.error("Error decoding URL state:", error);
        return null;
    }
}

export function loadStateFromUrl(): UrlState | null {
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get('state');
    if (stateParam) {
        return decodeUrlState(stateParam);
    }
    return null;
}

export function applyUrlState(state: UrlState, chartConfigs: UrlChartConfig[]): { appSettings: AppSettings, countryFilters: Map<string, string> } {
    // Apply language if present in state and valid
    if (state.language && (state.language === 'en' || state.language === 'cs')) {
        setLanguage(state.language as Language);
    }
    
    // Apply settings
    const appSettings = { ...DEFAULT_APP_SETTINGS, ...state.settings };
    saveAppSettings(appSettings);
    
    // Apply visibility state
    // Note: In new compact format, only 'true' values are stored, so missing series should default to false
    // Store the visibility map directly - the chart rendering code will handle merging with current series
    Object.entries(state.visibility).forEach(([visibilityKey, visibilityMap]) => {
        // Store visibility map from URL directly to localStorage
        // The chart rendering code will use this when determining visibility
        localStorage.setItem(visibilityKey, JSON.stringify(visibilityMap));
    });
    
    // Apply country filters
    const countryFilters = new Map<string, string>();
    Object.entries(state.countryFilters).forEach(([filterKey, country]) => {
        localStorage.setItem(filterKey, country);
        // Map back to container ID for the countryFilters map
        const cfg = chartConfigs.find(c => c.countryFilterKey === filterKey);
        if (cfg) {
            countryFilters.set(cfg.containerId, country);
        }
    });
    
    return { appSettings, countryFilters };
}
