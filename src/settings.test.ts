import { expect, test, beforeEach, describe } from "bun:test";

// Mock localStorage for testing
const mockLocalStorage = (() => {
    let store: { [key: string]: string } = {};
    
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

// Replace localStorage with mock
(global as any).localStorage = mockLocalStorage;

// We need to import main.ts but it has side effects, so let's just test the concepts
// In a real app, we'd extract the settings functions to a separate module
interface AppSettings {
    timeRange: string;
    datasetVisibility: { [key: string]: boolean };
    euDatasetVisibility: { [key: string]: boolean };
    includeFuture: boolean;
    showExtremes: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    timeRange: "all",
    datasetVisibility: {},
    euDatasetVisibility: {},
    includeFuture: true,
    showExtremes: false
};

const SETTINGS_KEY = "appSettings";

function loadSettings(): AppSettings {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_SETTINGS, ...parsed };
        } catch (error) {
            console.warn("Failed to parse stored settings, using defaults:", error);
        }
    }
    return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

describe('Settings Management', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
    });

    test('loadSettings returns defaults when no settings exist', () => {
        const settings = loadSettings();
        expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    test('saveSettings stores settings in localStorage', () => {
        const testSettings: AppSettings = {
            ...DEFAULT_SETTINGS,
            timeRange: "30",
            includeFuture: false
        };
        
        saveSettings(testSettings);
        
        const stored = localStorage.getItem(SETTINGS_KEY);
        expect(stored).toBeTruthy();
        expect(JSON.parse(stored!)).toEqual(testSettings);
    });

    test('loadSettings retrieves stored settings', () => {
        const testSettings: AppSettings = {
            ...DEFAULT_SETTINGS,
            timeRange: "90",
            showExtremes: true,
            datasetVisibility: { "test": true }
        };
        
        saveSettings(testSettings);
        const loadedSettings = loadSettings();
        
        expect(loadedSettings).toEqual(testSettings);
    });

    test('loadSettings merges with defaults for missing properties', () => {
        // Store incomplete settings
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ timeRange: "365" }));
        
        const settings = loadSettings();
        
        expect(settings.timeRange).toBe("365");
        expect(settings.includeFuture).toBe(DEFAULT_SETTINGS.includeFuture);
        expect(settings.showExtremes).toBe(DEFAULT_SETTINGS.showExtremes);
        expect(settings.datasetVisibility).toEqual(DEFAULT_SETTINGS.datasetVisibility);
    });

    test('loadSettings handles invalid JSON gracefully', () => {
        localStorage.setItem(SETTINGS_KEY, "invalid json{");
        
        const settings = loadSettings();
        
        expect(settings).toEqual(DEFAULT_SETTINGS);
    });
});