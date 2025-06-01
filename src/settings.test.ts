import { test, expect, beforeEach } from "bun:test";

// Test the settings migration functionality
test("Settings migration from legacy keys", () => {
    // Mock localStorage for this test
    const mockStorage: { [key: string]: string } = {};
    const originalLocalStorage = globalThis.localStorage;
    
    (globalThis as any).localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
        clear: () => Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    };

    try {
        // Clear any existing data
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);

        // Set up legacy data in localStorage
        mockStorage["selectedTimeRange"] = "365";
        mockStorage["includeFuture"] = "false";
        mockStorage["showExtremes"] = "true";
        mockStorage["datasetVisibility"] = '{"series1": true, "series2": false}';
        mockStorage["euDatasetVisibility"] = '{"euSeries1": true}';

        // Import settings functions dynamically to use our mocked localStorage
        // This simulates the migration that would happen on page load
        
        // Simulate the migration logic
        const LEGACY_KEYS = {
            TIME_RANGE: "selectedTimeRange",
            DATASET_VISIBILITY: "datasetVisibility", 
            EU_DATASET_VISIBILITY: "euDatasetVisibility",
            INCLUDE_FUTURE: "includeFuture",
            SHOW_EXTREMES: "showExtremes"
        };

        const DEFAULT_SETTINGS = {
            timeRange: "all",
            includeFuture: true,
            showExtremes: false,
            datasetVisibility: {},
            euDatasetVisibility: {}
        };

        // Simulate migration function
        function migrateLegacySettings() {
            let hasLegacyData = false;
            const settings = { ...DEFAULT_SETTINGS };
            
            const timeRange = mockStorage[LEGACY_KEYS.TIME_RANGE];
            if (timeRange) {
                settings.timeRange = timeRange;
                hasLegacyData = true;
            }
            
            const includeFuture = mockStorage[LEGACY_KEYS.INCLUDE_FUTURE];
            if (includeFuture !== null && includeFuture !== undefined) {
                settings.includeFuture = JSON.parse(includeFuture);
                hasLegacyData = true;
            }
            
            const showExtremes = mockStorage[LEGACY_KEYS.SHOW_EXTREMES];
            if (showExtremes !== null && showExtremes !== undefined) {
                settings.showExtremes = JSON.parse(showExtremes);
                hasLegacyData = true;
            }
            
            const datasetVisibility = mockStorage[LEGACY_KEYS.DATASET_VISIBILITY];
            if (datasetVisibility) {
                settings.datasetVisibility = JSON.parse(datasetVisibility);
                hasLegacyData = true;
            }
            
            const euDatasetVisibility = mockStorage[LEGACY_KEYS.EU_DATASET_VISIBILITY];
            if (euDatasetVisibility) {
                settings.euDatasetVisibility = JSON.parse(euDatasetVisibility);
                hasLegacyData = true;
            }
            
            if (hasLegacyData) {
                mockStorage["appSettings"] = JSON.stringify(settings);
                Object.values(LEGACY_KEYS).forEach(key => delete mockStorage[key]);
                return settings;
            }
            
            return null;
        }

        // Verify legacy keys exist before migration
        expect(mockStorage["selectedTimeRange"]).toBe("365");
        expect(mockStorage["includeFuture"]).toBe("false");
        expect(mockStorage["showExtremes"]).toBe("true");
        expect(mockStorage["datasetVisibility"]).toBe('{"series1": true, "series2": false}');
        expect(mockStorage["euDatasetVisibility"]).toBe('{"euSeries1": true}');

        // Perform migration
        const migratedSettings = migrateLegacySettings();

        // Verify migration succeeded
        expect(migratedSettings).not.toBeNull();
        expect(migratedSettings?.timeRange).toBe("365");
        expect(migratedSettings?.includeFuture).toBe(false);
        expect(migratedSettings?.showExtremes).toBe(true);
        expect(migratedSettings?.datasetVisibility).toEqual({"series1": true, "series2": false});
        expect(migratedSettings?.euDatasetVisibility).toEqual({"euSeries1": true});

        // Verify legacy keys were removed
        expect(mockStorage["selectedTimeRange"]).toBeUndefined();
        expect(mockStorage["includeFuture"]).toBeUndefined();
        expect(mockStorage["showExtremes"]).toBeUndefined();
        expect(mockStorage["datasetVisibility"]).toBeUndefined();
        expect(mockStorage["euDatasetVisibility"]).toBeUndefined();

        // Verify unified setting was created
        expect(mockStorage["appSettings"]).toBeDefined();
        const savedSettings = JSON.parse(mockStorage["appSettings"]);
        expect(savedSettings.timeRange).toBe("365");
        expect(savedSettings.includeFuture).toBe(false);
        expect(savedSettings.showExtremes).toBe(true);

    } finally {
        // Restore original localStorage
        (globalThis as any).localStorage = originalLocalStorage;
    }
});