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

// Type definitions for URL state
type AlignByExtreme = 'days' | 'maxima' | 'minima';

interface AppSettings {
    timeRange: string;
    includeFuture: boolean;
    showExtremes: boolean;
    showShifted: boolean;
    showTestNumbers: boolean;
    showShiftedTestNumbers: boolean;
    shiftOverride: number | null;
    alignByExtreme: AlignByExtreme;
}

interface UrlState {
    settings: AppSettings;
    visibility: {
        [key: string]: { [seriesName: string]: boolean };
    };
    countryFilters: {
        [key: string]: string;
    };
    language?: string; // Optional for backward compatibility
}

interface ChartConfig {
    containerId: string;
    visibilityKey: string;
    datasetVisibility: { [key: string]: boolean };
    countryFilterKey?: string;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
    timeRange: "365",
    includeFuture: false,
    showExtremes: false,
    showShifted: true,
    showTestNumbers: true,
    showShiftedTestNumbers: false,
    shiftOverride: 1,
    alignByExtreme: 'maxima'
};

// Mock language functions for testing
function getLanguage(): string {
    return mockLocalStorage.getItem('illmeter-language') || 'en';
}

function setLanguage(lang: string): void {
    mockLocalStorage.setItem('illmeter-language', lang);
}

// Implementation functions for testing
function encodeUrlState(appSettings: AppSettings, chartConfigs: ChartConfig[], countryFilters: Map<string, string>): string {
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

function decodeUrlState(encoded: string): UrlState | null {
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

describe('URL State Management Tests', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
    });

    test('encodes and decodes app settings correctly', () => {
        const settings: AppSettings = {
            timeRange: "90",
            includeFuture: true,
            showExtremes: true,
            showShifted: false,
            showTestNumbers: true,
            showShiftedTestNumbers: true,
            shiftOverride: 2,
            alignByExtreme: 'minima'
        };
        
        const chartConfigs: ChartConfig[] = [];
        const countryFilters = new Map<string, string>();
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded!.settings).toEqual(settings);
    });

    test('encodes and decodes dataset visibility correctly', () => {
        const settings = DEFAULT_APP_SETTINGS;
        const chartConfigs: ChartConfig[] = [
            {
                containerId: "czechDataContainer",
                visibilityKey: "datasetVisibility",
                datasetVisibility: {
                    "PCR Positivity": true,
                    "Antigen Positivity": false,
                    "PCR Positivity (28d avg)": true
                }
            },
            {
                containerId: "euDataContainer",
                visibilityKey: "euDatasetVisibility",
                datasetVisibility: {
                    "Influenza": true,
                    "RSV": false
                }
            }
        ];
        const countryFilters = new Map<string, string>();
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        // New compact format only stores 'true' values, so false values are omitted
        expect(decoded!.visibility["datasetVisibility"]).toEqual({
            "PCR Positivity": true,
            "PCR Positivity (28d avg)": true
        });
        expect(decoded!.visibility["euDatasetVisibility"]).toEqual({
            "Influenza": true
        });
    });

    test('encodes and decodes country filters correctly', () => {
        const settings = DEFAULT_APP_SETTINGS;
        const chartConfigs: ChartConfig[] = [
            {
                containerId: "euDataContainer",
                visibilityKey: "euDatasetVisibility",
                datasetVisibility: {},
                countryFilterKey: "euCountryFilter"
            }
        ];
        const countryFilters = new Map<string, string>([
            ["euDataContainer", "Germany"]
        ]);
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded!.countryFilters["euCountryFilter"]).toBe("Germany");
    });

    test('encodes complete state with all components', () => {
        const settings: AppSettings = {
            timeRange: "180",
            includeFuture: true,
            showExtremes: false,
            showShifted: true,
            showTestNumbers: false,
            showShiftedTestNumbers: false,
            shiftOverride: 3,
            alignByExtreme: 'days'
        };
        
        const chartConfigs: ChartConfig[] = [
            {
                containerId: "czechDataContainer",
                visibilityKey: "datasetVisibility",
                datasetVisibility: {
                    "PCR Positivity": true,
                    "Antigen Positivity": true
                }
            },
            {
                containerId: "euDataContainer",
                visibilityKey: "euDatasetVisibility",
                datasetVisibility: {
                    "Influenza": false,
                    "RSV": true
                },
                countryFilterKey: "euCountryFilter"
            }
        ];
        const countryFilters = new Map<string, string>([
            ["euDataContainer", "France"]
        ]);
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded!.settings).toEqual(settings);
        // Compact format only stores true values
        expect(decoded!.visibility["datasetVisibility"]).toEqual({
            "PCR Positivity": true,
            "Antigen Positivity": true
        });
        expect(decoded!.visibility["euDatasetVisibility"]).toEqual({
            "RSV": true
        });
        expect(decoded!.countryFilters["euCountryFilter"]).toBe("France");
    });

    test('handles empty visibility and country filters', () => {
        const settings = DEFAULT_APP_SETTINGS;
        const chartConfigs: ChartConfig[] = [
            {
                containerId: "czechDataContainer",
                visibilityKey: "datasetVisibility",
                datasetVisibility: {}
            }
        ];
        const countryFilters = new Map<string, string>();
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded!.settings).toEqual(settings);
        // When all series are false (hidden), compact format doesn't store visibility key at all
        expect(decoded!.visibility).toEqual({});
        expect(decoded!.countryFilters).toEqual({});
    });

    test('handles invalid base64 encoding', () => {
        const decoded = decodeUrlState("invalid-base64");
        expect(decoded).toBeNull();
    });

    test('handles invalid JSON in encoded state', () => {
        const invalidJson = btoa("{invalid json");
        const decoded = decodeUrlState(invalidJson);
        expect(decoded).toBeNull();
    });

    test('encoded state is URL-safe', () => {
        const settings: AppSettings = {
            timeRange: "365",
            includeFuture: true,
            showExtremes: true,
            showShifted: true,
            showTestNumbers: true,
            showShiftedTestNumbers: false,
            shiftOverride: 1,
            alignByExtreme: 'maxima'
        };
        
        const chartConfigs: ChartConfig[] = [
            {
                containerId: "czechDataContainer",
                visibilityKey: "datasetVisibility",
                datasetVisibility: {
                    "PCR Positivity (28d avg) shifted by 1 wave -347d": true
                }
            }
        ];
        const countryFilters = new Map<string, string>();
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        
        // Check that encoded string doesn't contain URL-unsafe characters
        // Base64 uses A-Z, a-z, 0-9, +, /, = which are URL-safe
        expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
        
        // Verify it can be decoded
        const decoded = decodeUrlState(encoded);
        expect(decoded).not.toBeNull();
    });

    test('preserves all shift alignment modes', () => {
        const modes: AlignByExtreme[] = ['days', 'maxima', 'minima'];
        
        modes.forEach(mode => {
            const settings: AppSettings = {
                ...DEFAULT_APP_SETTINGS,
                alignByExtreme: mode,
                shiftOverride: mode === 'days' ? 0 : 2
            };
            
            const chartConfigs: ChartConfig[] = [];
            const countryFilters = new Map<string, string>();
            
            const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
            const decoded = decodeUrlState(encoded);
            
            expect(decoded).not.toBeNull();
            expect(decoded!.settings.alignByExtreme).toBe(mode);
            expect(decoded!.settings.shiftOverride).toBe(settings.shiftOverride);
        });
    });

    test('handles null shiftOverride', () => {
        const settings: AppSettings = {
            ...DEFAULT_APP_SETTINGS,
            shiftOverride: null
        };
        
        const chartConfigs: ChartConfig[] = [];
        const countryFilters = new Map<string, string>();
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded!.settings.shiftOverride).toBeNull();
    });

    test('encodes and decodes language correctly', () => {
        const settings = DEFAULT_APP_SETTINGS;
        const chartConfigs: ChartConfig[] = [];
        const countryFilters = new Map<string, string>();
        
        // Set language to Czech in localStorage
        mockLocalStorage.setItem('illmeter-language', 'cs');
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded!.language).toBe('cs');
        
        // Test with English
        mockLocalStorage.setItem('illmeter-language', 'en');
        const encodedEn = encodeUrlState(settings, chartConfigs, countryFilters);
        const decodedEn = decodeUrlState(encodedEn);
        
        expect(decodedEn).not.toBeNull();
        expect(decodedEn!.language).toBe('en');
    });

    test('handles missing language for backward compatibility', () => {
        // Create a state without language field (old version)
        const oldState = {
            settings: DEFAULT_APP_SETTINGS,
            visibility: {},
            countryFilters: {}
        };
        
        const encoded = btoa(JSON.stringify(oldState));
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded!.language).toBeUndefined();
    });

    test('compact format significantly reduces URL size', () => {
        const settings = DEFAULT_APP_SETTINGS;
        const chartConfigs: ChartConfig[] = [
            {
                containerId: "czechDataContainer",
                visibilityKey: "czechDataChart-visibility",
                datasetVisibility: {
                    "PCR Positivity": true,
                    "Antigen Positivity": false,
                    "PCR Positivity (28d avg)": true,
                    "Antigen Positivity (28d avg)": false,
                    "PCR Positivity shifted by 1 wave -289d": false,
                    "Antigen Positivity shifted by 1 wave -347d": false
                }
            },
            {
                containerId: "euDataContainer",
                visibilityKey: "euDataChart-visibility",
                datasetVisibility: {
                    "Influenza Positivity": true,
                    "RSV Positivity": false,
                    "SARS-CoV-2 Positivity": true,
                    "Influenza Positivity (28d avg)": false,
                    "RSV Positivity (28d avg)": false,
                    "SARS-CoV-2 Positivity (28d avg)": false
                },
                countryFilterKey: "euCountryFilter"
            }
        ];
        const countryFilters = new Map<string, string>([
            ["euDataContainer", "EU/EEA"]
        ]);
        
        const encoded = encodeUrlState(settings, chartConfigs, countryFilters);
        const decoded = decodeUrlState(encoded);
        
        // Verify correctness
        expect(decoded).not.toBeNull();
        
        // Compact format should be significantly shorter than if we stored all false values
        // With 12 series (6 true, 6 false), compact format only stores 6 true values
        // Expected savings: ~50-60% for visibility section
        const decodedJson = atob(encoded);
        
        // Verify only true values are in the visibility section (false values from settings are OK)
        // Check that visibility objects only contain true
        expect(decodedJson).toContain('"v":{');  // v is the visibility key
        const visibilityMatch = decodedJson.match(/"v":\{[^}]*\}/);
        if (visibilityMatch) {
            const visibilitySection = visibilityMatch[0];
            // In visibility section, we should only have :true, not :false
            const falseInVisibility = visibilitySection.includes(':false');
            expect(falseInVisibility).toBe(false);
        }
        
        // Verify short keys are used
        expect(decodedJson).toContain('"s":');
        expect(decodedJson).toContain('"v":');
        expect(decodedJson).toContain('"c":');
        expect(decodedJson).toContain('"l":');
    });

    test('decodes old format for backward compatibility', () => {
        // Create an old-format state with full keys
        const oldFormatState = {
            settings: DEFAULT_APP_SETTINGS,
            visibility: {
                "czechDataChart-visibility": {
                    "PCR Positivity": true,
                    "Antigen Positivity": false
                }
            },
            countryFilters: {
                "euCountryFilter": "Germany"
            },
            language: "en"
        };
        
        const encoded = btoa(JSON.stringify(oldFormatState));
        const decoded = decodeUrlState(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded!.settings).toEqual(DEFAULT_APP_SETTINGS);
        expect(decoded!.visibility["czechDataChart-visibility"]).toEqual({
            "PCR Positivity": true,
            "Antigen Positivity": false
        });
        expect(decoded!.countryFilters["euCountryFilter"]).toBe("Germany");
        expect(decoded!.language).toBe("en");
    });
});
