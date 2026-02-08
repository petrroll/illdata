// Unified app settings management
// Extracted from main.ts for testability and reuse

// Alignment method type: 'days' for manual shift by days, 'maxima'/'minima' for automatic wave alignment
export type AlignByExtreme = 'days' | 'maxima' | 'minima';

export interface AppSettings {
    timeRange: string;
    includeFuture: boolean;
    showExtremes: boolean;
    showShifted: boolean;
    showTestNumbers: boolean;
    showShiftedTestNumbers: boolean;
    showNonAveragedSeries: boolean;
    // Shift value: either days for manual shift or wave count for automatic alignment
    // When alignByExtreme is 'days': shift by this many days
    // When alignByExtreme is 'maxima' or 'minima': shift by this many waves back to align to the last wave
    shiftOverride: number | null;
    // Alignment method: 'days' for manual shift, 'maxima'/'minima' for automatic alignment
    alignByExtreme: AlignByExtreme;
}

// Default values for app settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
    timeRange: "365",
    includeFuture: false,
    showExtremes: false,
    showShifted: true,
    showTestNumbers: true,
    showShiftedTestNumbers: false,
    showNonAveragedSeries: false, // Hide non-averaged series by default
    shiftOverride: 1, // Default to 1 wave for maxima/minima alignment
    alignByExtreme: 'maxima'
};

// Settings manager
export const APP_SETTINGS_KEY = "appSettings";

export function loadAppSettings(): AppSettings {
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

export function saveAppSettings(settings: AppSettings): void {
    try {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Error saving app settings:", error);
    }
}

// Legacy support - migrate old individual keys to unified settings
export function migrateOldSettings(): void {
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
