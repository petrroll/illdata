import { describe, test, expect, beforeEach } from 'bun:test';

// Mock localStorage for testing
const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

// Mock the global localStorage
Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

// Simple test module to validate settings logic
interface AppSettings {
    timeRange: string;
    includeFuture: boolean;
    showExtremes: boolean;
    showShifted?: boolean;
    showTestNumbers?: boolean;
    showShiftedTestNumbers?: boolean;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
    timeRange: "all",
    includeFuture: true,
    showExtremes: false,
    showShifted: true,
    showTestNumbers: true,
    showShiftedTestNumbers: false
};

const APP_SETTINGS_KEY = "appSettings";

function loadAppSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(APP_SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
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

describe('Unified Settings Tests', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
    });

    test('loads default settings when no stored settings exist', () => {
        const settings = loadAppSettings();
        expect(settings).toEqual(DEFAULT_APP_SETTINGS);
    });

    test('saves and loads settings correctly', () => {
        const customSettings: AppSettings = {
            timeRange: "365",
            includeFuture: false,
            showExtremes: true,
            showShifted: true,
            showTestNumbers: true,
            showShiftedTestNumbers: false
        };
        
        saveAppSettings(customSettings);
        const loadedSettings = loadAppSettings();
        
        expect(loadedSettings).toEqual(customSettings);
    });

    test('merges partial stored settings with defaults', () => {
        // Store incomplete settings
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ timeRange: "90" }));
        
        const settings = loadAppSettings();
        
        expect(settings).toEqual({
            timeRange: "90",
            includeFuture: true,  // from defaults
            showExtremes: false,   // from defaults
            showShifted: true,  // from defaults
            showTestNumbers: true,  // from defaults
            showShiftedTestNumbers: false  // from defaults
        });
    });

    test('migrates old individual localStorage keys', () => {
        // Set up old format
        localStorage.setItem("selectedTimeRange", "365");
        localStorage.setItem("includeFuture", "false");
        localStorage.setItem("showExtremes", "true");
        
        migrateOldSettings();
        
        // Check that unified settings were created
        const settings = loadAppSettings();
        expect(settings).toEqual({
            timeRange: "365",
            includeFuture: false,
            showExtremes: true,
            showShifted: true,  // from defaults
            showTestNumbers: true,  // from defaults
            showShiftedTestNumbers: false  // from defaults
        });
        
        // Check that old keys were removed
        expect(localStorage.getItem("selectedTimeRange")).toBeNull();
        expect(localStorage.getItem("includeFuture")).toBeNull();
        expect(localStorage.getItem("showExtremes")).toBeNull();
    });

    test('handles partial old settings migration', () => {
        // Set up only some old format keys
        localStorage.setItem("selectedTimeRange", "90");
        localStorage.setItem("showExtremes", "true");
        // includeFuture is missing
        
        migrateOldSettings();
        
        const settings = loadAppSettings();
        expect(settings).toEqual({
            timeRange: "90",
            includeFuture: true,  // from defaults
            showExtremes: true,
            showShifted: true,  // from defaults
            showTestNumbers: true,  // from defaults
            showShiftedTestNumbers: false  // from defaults
        });
    });

    test('handles corrupted localStorage gracefully', () => {
        localStorage.setItem(APP_SETTINGS_KEY, "invalid json");
        
        const settings = loadAppSettings();
        expect(settings).toEqual(DEFAULT_APP_SETTINGS);
    });

    test('showShiftedTestNumbers defaults to false', () => {
        const settings = loadAppSettings();
        expect(settings.showShiftedTestNumbers).toBe(false);
    });

    test('saves and loads showShiftedTestNumbers correctly', () => {
        const customSettings: AppSettings = {
            timeRange: "365",
            includeFuture: false,
            showExtremes: true,
            showShifted: true,
            showTestNumbers: true,
            showShiftedTestNumbers: true  // Enable the new setting
        };
        
        saveAppSettings(customSettings);
        const loadedSettings = loadAppSettings();
        
        expect(loadedSettings.showShiftedTestNumbers).toBe(true);
        expect(loadedSettings).toEqual(customSettings);
    });
});