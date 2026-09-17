import { describe, test, expect, beforeEach } from 'bun:test';
import { loadAppSettings, saveAppSettings, migrateOldSettings, migrateLegacyVariantVisibility, DEFAULT_APP_SETTINGS, APP_SETTINGS_KEY, type AppSettings } from './settings';

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

describe('Unified Settings Tests', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
    });

    test('loads default settings when no stored settings exist', () => {
        const settings = loadAppSettings();
        expect(settings).toEqual(DEFAULT_APP_SETTINGS);
    });

    test('selection arrays are independent between loads and do not mutate defaults', () => {
        const first = loadAppSettings();
        first.dataViews.push('ratio7');
        first.smoothingWindows.push('none');
        expect(loadAppSettings().dataViews).toEqual(['raw']);
        expect(loadAppSettings().smoothingWindows).toEqual(['28']);
        expect(DEFAULT_APP_SETTINGS.dataViews).toEqual(['raw']);
        expect(DEFAULT_APP_SETTINGS.smoothingWindows).toEqual(['28']);
    });

    test('saves and loads settings correctly', () => {
        const customSettings: AppSettings = {
            timeRange: "365",
            includeFuture: false,
            showExtremes: true,
            showShifted: true,
            showTestNumbers: true,
            showShiftedTestNumbers: false,
            smoothingWindows: ['none', '28'],
            shiftOverride: 1,
            alignByExtreme: 'maxima',
            dataViews: ['raw']
        };
        
        saveAppSettings(customSettings);
        const loadedSettings = loadAppSettings();
        
        expect(loadedSettings).toEqual(customSettings);
    });

    test('merges partial stored settings with defaults', () => {
        // Store incomplete settings
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ timeRange: "90" }));
        
        const settings = loadAppSettings();
        
        expect(settings.timeRange).toBe("90");
        // All other fields should come from defaults
        expect(settings.includeFuture).toBe(DEFAULT_APP_SETTINGS.includeFuture);
        expect(settings.showExtremes).toBe(DEFAULT_APP_SETTINGS.showExtremes);
        expect(settings.showShifted).toBe(DEFAULT_APP_SETTINGS.showShifted);
        expect(settings.showTestNumbers).toBe(DEFAULT_APP_SETTINGS.showTestNumbers);
        expect(settings.showShiftedTestNumbers).toBe(DEFAULT_APP_SETTINGS.showShiftedTestNumbers);
        expect(settings.shiftOverride).toBe(DEFAULT_APP_SETTINGS.shiftOverride);
        expect(settings.alignByExtreme).toBe(DEFAULT_APP_SETTINGS.alignByExtreme);
    });

    test('migrates old individual localStorage keys', () => {
        // Set up old format
        localStorage.setItem("selectedTimeRange", "365");
        localStorage.setItem("includeFuture", "false");
        localStorage.setItem("showExtremes", "true");
        
        migrateOldSettings();
        
        // Check that unified settings were created
        const settings = loadAppSettings();
        expect(settings.timeRange).toBe("365");
        expect(settings.includeFuture).toBe(false);
        expect(settings.showExtremes).toBe(true);
        // Fields not in old format should come from defaults
        expect(settings.showShifted).toBe(DEFAULT_APP_SETTINGS.showShifted);
        expect(settings.showTestNumbers).toBe(DEFAULT_APP_SETTINGS.showTestNumbers);
        expect(settings.showShiftedTestNumbers).toBe(DEFAULT_APP_SETTINGS.showShiftedTestNumbers);
        expect(settings.shiftOverride).toBe(DEFAULT_APP_SETTINGS.shiftOverride);
        expect(settings.alignByExtreme).toBe(DEFAULT_APP_SETTINGS.alignByExtreme);
        
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
        expect(settings.timeRange).toBe("90");
        expect(settings.includeFuture).toBe(DEFAULT_APP_SETTINGS.includeFuture); // from defaults
        expect(settings.showExtremes).toBe(true);
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

    test('defaults to absolute data with the existing 28-day smoothing', () => {
        const settings = loadAppSettings();
        expect(settings.dataViews).toEqual(['raw']);
        expect(settings.smoothingWindows).toEqual(['28']);
    });

    test('saves and loads smoothing selections correctly', () => {
        const customSettings: AppSettings = {
            timeRange: "365",
            includeFuture: false,
            showExtremes: true,
            showShifted: true,
            showTestNumbers: true,
            showShiftedTestNumbers: false,
            smoothingWindows: ['28'],
            shiftOverride: 1,
            alignByExtreme: 'maxima',
            dataViews: ['raw']
        };
        
        saveAppSettings(customSettings);
        const loadedSettings = loadAppSettings();
        
        expect(loadedSettings.smoothingWindows).toEqual(['28']);
        expect(loadedSettings).toEqual(customSettings);
    });

    test('saves and loads showShiftedTestNumbers correctly', () => {
        const customSettings: AppSettings = {
            timeRange: "365",
            includeFuture: false,
            showExtremes: true,
            showShifted: true,
            showTestNumbers: true,
            showShiftedTestNumbers: true,  // Enable the new setting
            smoothingWindows: ['none', '28'],
            shiftOverride: 1,
            alignByExtreme: 'maxima',
            dataViews: ['raw']
        };
        
        saveAppSettings(customSettings);
        const loadedSettings = loadAppSettings();
        
        expect(loadedSettings.showShiftedTestNumbers).toBe(true);
        expect(loadedSettings).toEqual(customSettings);
    });

    test('migrates old useCustomShift setting', () => {
        const oldSettings = {
            timeRange: "365",
            includeFuture: false,
            showExtremes: false,
            showShifted: true,
            showTestNumbers: true,
            showShiftedTestNumbers: false,
            useCustomShift: true,
            shiftOverride: 1
        };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(oldSettings));
        
        const settings = loadAppSettings();
        expect(settings.alignByExtreme).toBe('days');
        expect((settings as any).useCustomShift).toBeUndefined();
    });

    test('migrates legacy ratio and raw toggles without retaining conflicting settings', () => {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ derivativeView: '7', showNonAveragedSeries: true }));
        const settings = loadAppSettings();
        expect(settings.dataViews).toEqual(['ratio7']);
        expect(settings.smoothingWindows).toEqual(['none', '28']);
        expect(settings).not.toHaveProperty('derivativeView');
        expect(settings).not.toHaveProperty('showNonAveragedSeries');
    });

    test('migrates legacy ratio visibility keys including shifts but not test bars', () => {
        const visibility = {
            'PCR Positivity (28d avg)': false,
            'PCR Positivity (28d avg) shifted by -10d': true,
            'PCR Positivity - Positive Tests': true
        };
        const migrated = migrateLegacyVariantVisibility({ derivativeView: '7' }, visibility);
        expect(migrated['PCR Positivity (28d avg) - 7d Ratio']).toBe(false);
        expect(migrated['PCR Positivity (28d avg) - 7d Ratio shifted by -10d']).toBe(true);
        expect(migrated['PCR Positivity - Positive Tests - 7d Ratio']).toBeUndefined();
        expect(migrateLegacyVariantVisibility({ derivativeView: '7', dataViews: ['ratio7'] }, visibility)).toBe(visibility);
    });

    test('validates, deduplicates, and orders selections while preserving explicit emptiness', () => {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({
            dataViews: ['ratio28', 'bogus', 'raw', 'raw'], smoothingWindows: ['7', 28, 'none', '7']
        }));
        expect(loadAppSettings().dataViews).toEqual(['raw', 'ratio28']);
        expect(loadAppSettings().smoothingWindows).toEqual(['none', '7']);
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ dataViews: [], smoothingWindows: [] }));
        expect(loadAppSettings().dataViews).toEqual([]);
        expect(loadAppSettings().smoothingWindows).toEqual([]);
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ dataViews: ['bad'], smoothingWindows: null }));
        expect(loadAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
    });

    test('new arrays take precedence over legacy fields and defaults are not shared', () => {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({
            dataViews: ['raw', 'ratio28'], smoothingWindows: ['7'], derivativeView: '7', showNonAveragedSeries: true
        }));
        expect(loadAppSettings().dataViews).toEqual(['raw', 'ratio28']);
        expect(loadAppSettings().smoothingWindows).toEqual(['7']);
        localStorage.clear();
        loadAppSettings().dataViews.push('ratio7');
        expect(loadAppSettings().dataViews).toEqual(['raw']);
    });

    test('migrates old shiftOverrideDays setting', () => {
        const oldSettings = {
            timeRange: "365",
            includeFuture: false,
            showExtremes: false,
            showShifted: true,
            showTestNumbers: true,
            showShiftedTestNumbers: false,
            shiftOverrideDays: 42,
            alignByExtreme: 'days'
        };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(oldSettings));
        
        const settings = loadAppSettings();
        expect(settings.shiftOverride).toBe(42);
        expect((settings as any).shiftOverrideDays).toBeUndefined();
    });
});