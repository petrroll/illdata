// Unified app settings management
// Extracted from main.ts for testability and reuse

// Alignment method type: 'days' for manual shift by days, 'maxima'/'minima' for automatic wave alignment
export type AlignByExtreme = 'days' | 'maxima' | 'minima';

// Derivative view: 'off' shows absolute values, '7'/'28' show the ratio between the last
// 7 (resp. 28) days and the 7 (resp. 28) days before them - the same measure as the trends table
export const DATA_VIEWS = ['raw', 'ratio7', 'ratio28'] as const;
export type DataView = typeof DATA_VIEWS[number];
export const SMOOTHING_WINDOWS = ['none', '7', '28'] as const;
export type SmoothingWindow = typeof SMOOTHING_WINDOWS[number];

export interface AppSettings {
    timeRange: string;
    includeFuture: boolean;
    showExtremes: boolean;
    showShifted: boolean;
    showTestNumbers: boolean;
    showShiftedTestNumbers: boolean;
    // Shift value: either days for manual shift or wave count for automatic alignment
    // When alignByExtreme is 'days': shift by this many days
    // When alignByExtreme is 'maxima' or 'minima': shift by this many waves back to align to the last wave
    shiftOverride: number | null;
    // Alignment method: 'days' for manual shift, 'maxima'/'minima' for automatic alignment
    alignByExtreme: AlignByExtreme;
    dataViews: DataView[];
    smoothingWindows: SmoothingWindow[];
}

// Default values for app settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
    timeRange: "365",
    includeFuture: false,
    showExtremes: false,
    showShifted: true,
    showTestNumbers: true,
    showShiftedTestNumbers: false,
    shiftOverride: 1, // Default to 1 wave for maxima/minima alignment
    alignByExtreme: 'maxima',
    dataViews: ['raw'],
    smoothingWindows: ['28']
};

// Settings manager
export const APP_SETTINGS_KEY = "appSettings";

function normalizeSelection<T extends string>(value: unknown, allowed: readonly T[], fallback: readonly T[]): T[] {
    if (!Array.isArray(value)) return [...fallback];
    // An explicitly empty array means no variants; malformed nonempty arrays use the default.
    const selected = allowed.filter(option => value.includes(option));
    return value.length === 0 || selected.length > 0 ? selected : [...fallback];
}

export function normalizeAppSettings(value: unknown): AppSettings {
    const parsed = value && typeof value === 'object' && !Array.isArray(value)
        ? { ...value } as Record<string, unknown> : {};
    if (parsed.useCustomShift === true) parsed.alignByExtreme = 'days';
    if ('shiftOverrideDays' in parsed) parsed.shiftOverride = parsed.shiftOverrideDays;
    const legacyViews: DataView[] = parsed.derivativeView === '7' ? ['ratio7']
        : parsed.derivativeView === '28' ? ['ratio28'] : ['raw'];
    const legacySmoothing: SmoothingWindow[] = parsed.showNonAveragedSeries === true ? ['none', '28'] : ['28'];
    const dataViews = normalizeSelection(parsed.dataViews, DATA_VIEWS, legacyViews);
    const smoothingWindows = normalizeSelection(parsed.smoothingWindows, SMOOTHING_WINDOWS, legacySmoothing);
    for (const key of ['useCustomShift', 'shiftOverrideDays', 'derivativeView', 'showNonAveragedSeries']) delete parsed[key];
    return { ...DEFAULT_APP_SETTINGS, ...parsed, dataViews, smoothingWindows };
}

/** Legacy ratio views reused absolute-series keys, so preserve those explicit visibility choices. */
export function migrateLegacyVariantVisibility(settings: unknown, visibility: Record<string, boolean>): Record<string, boolean> {
    const legacy = settings as Record<string, unknown> | null;
    if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy.dataViews)
        || (legacy.derivativeView !== '7' && legacy.derivativeView !== '28')) return visibility;
    const migrated = { ...visibility };
    Object.entries(visibility).forEach(([name, visible]) => {
        if (/ - (Positive|Negative) Tests| (maxima|minima) over | - (7|28)d Ratio/.test(name)) return;
        const shiftIndex = name.indexOf(' shifted');
        const base = shiftIndex < 0 ? name : name.slice(0, shiftIndex);
        const shift = shiftIndex < 0 ? '' : name.slice(shiftIndex);
        migrated[`${base} - ${legacy.derivativeView}d Ratio${shift}`] = visible;
    });
    return migrated;
}

export function loadAppSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(APP_SETTINGS_KEY);
        if (stored) {
            return normalizeAppSettings(JSON.parse(stored));
        }
    } catch (error) {
        console.error("Error loading app settings:", error);
    }
    return normalizeAppSettings({});
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
