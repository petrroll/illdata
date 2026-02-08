// Series utility functions for identifying and categorizing data series
// Extracted from main.ts to reduce special-casing based on string matching

import { normalizeSeriesName } from './locales';

// Constants for dataset filtering
export const SHIFTED_SERIES_IDENTIFIER = 'shifted';
export const TEST_NUMBERS_IDENTIFIER = 'tests';
export const MIN_MAX_IDENTIFIER = ['min', 'max'];

// Shared shift-related regex patterns used by getBaseSeriesName and getBaseSeriesNameWithoutShift
const SHIFT_PATTERNS = [
    / shifted by \d+ waves? (?:-?\d+|NaN)d/,
    / shifted by -?\d+d/,
    / maxima over \d+d/,
    / minima over \d+d/,
];

/**
 * Helper: checks if a normalized series label includes the given identifier.
 * By default, comparison is case-insensitive. Set caseInsensitive=false for exact case matching.
 */
function normalizedLabelIncludes(label: string, identifier: string, caseInsensitive = true): boolean {
    const normalized = normalizeSeriesName(label);
    return caseInsensitive ? normalized.toLowerCase().includes(identifier) : normalized.includes(identifier);
}

/**
 * Series metadata and classification functions
 */

/**
 * Checks if a series is a shifted series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is shifted
 */
export function isShiftedSeries(label: string): boolean {
    return normalizedLabelIncludes(label, SHIFTED_SERIES_IDENTIFIER);
}

/**
 * Checks if a series is a test number series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is a test number series
 */
export function isTestNumberSeries(label: string): boolean {
    return normalizedLabelIncludes(label, TEST_NUMBERS_IDENTIFIER);
}

/**
 * Checks if a series is a min/max series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is a min/max series
 */
export function isMinMaxSeries(label: string): boolean {
    return MIN_MAX_IDENTIFIER.some(id => normalizedLabelIncludes(label, id));
}

/**
 * Checks if a series is a positivity series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is a positivity series
 */
export function isPositivitySeries(label: string): boolean {
    return normalizedLabelIncludes(label, 'positivity');
}

/**
 * Checks if a series is an averaged series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is averaged
 */
export function isAveragedSeries(label: string): boolean {
    return normalizedLabelIncludes(label, 'd avg)', false);
}

/**
 * Checks if a series is a positive test series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series represents positive tests
 */
export function isPositiveTestSeries(label: string): boolean {
    return normalizedLabelIncludes(label, ' - Positive Tests', false);
}

/**
 * Checks if a series is a negative test series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series represents negative tests
 */
export function isNegativeTestSeries(label: string): boolean {
    return normalizedLabelIncludes(label, ' - Negative Tests', false);
}

/**
 * Gets the base series name for a test pair (removing the " - Positive/Negative Tests" suffix)
 * @param label - Series label for a positive or negative test series
 * @returns Base series name without test type suffix
 */
export function getTestPairBaseName(label: string): string {
    const normalizedLabel = normalizeSeriesName(label);
    return normalizedLabel
        .replace(' - Positive Tests', '')
        .replace(' - Negative Tests', '');
}

/**
 * Checks if a series is a shifted test number series
 * @param label - Series label (in any language)
 * @returns True if the series is both shifted and a test number/positivity series
 */
export function isShiftedTestNumberSeries(label: string): boolean {
    const shifted = isShiftedSeries(label);
    const testNumber = isTestNumberSeries(label);
    const positivity = isPositivitySeries(label);
    
    return shifted && (testNumber || positivity);
}

/**
 * Extracts a shortened shift suffix from a series label for display.
 * 
 * Examples:
 * - "PCR Positivity (28d avg) shifted by 1 wave -347d" -> "shifted by 1 wave (-347 days)"
 * - "PCR Positivity (28d avg) shifted by 2 waves -289d" -> "shifted by 2 waves (-289 days)"
 * - "PCR Positivity (28d avg) shifted by -300d" -> "shifted by -300 days"
 * - "Influenza Positivity" -> "" (no shift info)
 * 
 * @param label - Series label (in any language)
 * @returns Formatted shift suffix string in English, or empty string if not shifted
 */
export function extractShiftSuffix(label: string): string {
    const normalizedLabel = normalizeSeriesName(label);
    
    // Pattern 1: Wave-based shift: "shifted by X wave(s) -347d" or "shifted by X wave(s) 347d" or "shifted by X wave(s) NaNd"
    const wavePattern = /shifted by (\d+) (waves?) ((?:-?\d+|NaN))d/;
    const waveMatch = normalizedLabel.match(wavePattern);
    if (waveMatch) {
        const waveCount = waveMatch[1];
        const waveWord = waveMatch[2];
        const days = waveMatch[3];
        return `shifted by ${waveCount} ${waveWord} (${days} days)`;
    }
    
    // Pattern 2: Custom day shift: "shifted by -180d" or "shifted by 180d"
    const dayPattern = /shifted by (-?\d+)d/;
    const dayMatch = normalizedLabel.match(dayPattern);
    if (dayMatch) {
        return `shifted by ${dayMatch[1]} days`;
    }
    
    return '';
}

/**
 * Applies shift-related regex replacements to a label.
 * Used by both getBaseSeriesNameWithoutShift and getBaseSeriesName.
 */
function replaceShiftPatterns(label: string, replacement: string): string {
    let result = label;
    for (const pattern of SHIFT_PATTERNS) {
        result = result.replace(pattern, replacement);
    }
    return result.trim();
}

/**
 * Removes all shift and extreme suffixes from a label.
 * This applies shift-related patterns regardless of whether the label is shifted.
 */
export function stripShiftAndExtremeSuffixes(label: string): string {
    return replaceShiftPatterns(label, '');
}

/**
 * Extracts the base series name without ANY shift information.
 * Completely removes the shift suffix to get the original series name.
 * 
 * Examples:
 * - "PCR Positivity (28d avg) shifted by 1 wave -347d" -> "PCR Positivity (28d avg)"
 * - "PCR Positivity (28d avg) shifted by -300d" -> "PCR Positivity (28d avg)"
 * - "RSV Wastewater shifted by 1 wave NaNd" -> "RSV Wastewater"
 * - "Influenza Positivity" -> "Influenza Positivity" (unchanged, no shift info)
 */
export function getBaseSeriesNameWithoutShift(label: string): string {
    if (!isShiftedSeries(label)) {
        return label;
    }
    return replaceShiftPatterns(label, '');
}

/**
 * Extracts the base series name without shift information.
 * This allows tracking visibility across different shift values AND shift modes.
 * Only strips shift suffix if the series is actually a shifted series to avoid
 * collision with non-shifted series that might have similar names.
 * 
 * IMPORTANT: Normalizes ALL shifted series (wave-based and custom) to the same pattern
 * "shifted" to enable visibility preservation when switching between alignment modes
 * (e.g., from Maxima to Days mode).
 * 
 * Examples:
 * - "PCR Positivity (28d avg) shifted by 1 wave -347d" -> "PCR Positivity (28d avg) shifted"
 * - "PCR Positivity (28d avg) shifted by 1 wave 347d" -> "PCR Positivity (28d avg) shifted"
 * - "PCR Positivity (28d avg) shifted by -300d" -> "PCR Positivity (28d avg) shifted"
 * - "PCR Positivity (28d avg) shifted by 300d" -> "PCR Positivity (28d avg) shifted"
 * - "Influenza Positivity" -> "Influenza Positivity" (unchanged, no shift info)
 * - "Influenza Positivity (28d avg)" -> "Influenza Positivity (28d avg)" (unchanged, no shift info)
 */
export function getBaseSeriesName(label: string): string {
    if (!isShiftedSeries(label)) {
        return label;
    }
    return replaceShiftPatterns(label, ' shifted');
}

/**
 * Checks if a series is a non-averaged series (raw series) based on its type
 * @param series - Series object with type property
 * @returns True if the series is a raw (non-averaged) series
 */
export function isNonAveragedSeries(series: { type: string }): boolean {
    return series.type === 'raw';
}

/**
 * Determines the default visibility for a series based on its label and current settings.
 * 
 * @param label - Series label (in any language)
 * @param showShifted - Whether shifted series should be shown
 * @param showTestNumbers - Whether test number series should be shown
 * @param showShiftedTestNumbers - Whether shifted test number series should be shown
 * @param showNonAveragedSeries - Whether non-averaged (raw) series should be shown
 * @param seriesType - Optional series type ('raw' or 'averaged') for more precise filtering
 * @returns True if the series should be visible by default
 */
export function getVisibilityDefault(
    label: string, 
    showShifted: boolean = true, 
    showTestNumbers: boolean = true, 
    showShiftedTestNumbers: boolean = false,
    showNonAveragedSeries: boolean = false,
    seriesType?: 'raw' | 'averaged'
): boolean {
    // Hide min/max datasets by default
    if (isMinMaxSeries(label)) {
        return false;
    }
    
    // Hide shifted test numbers if the setting is false
    if (isShiftedTestNumberSeries(label) && !showShiftedTestNumbers) {
        return false;
    }
    
    // Shifted series should be hidden by default (though the toggle remains ON)
    // This allows them to be toggled in the legend but starts them as disabled
    if (isShiftedSeries(label)) {
        return false;
    }

    // Show/hide test number bar charts based on setting (default: shown)
    if (isTestNumberSeries(label)) {
        return showTestNumbers;
    }

    // Hide non-averaged (raw) series if the setting is false
    // Only apply this filter if we have type information and it's not a test number series
    if (seriesType === 'raw' && !showNonAveragedSeries) {
        return false;
    }

    // Show all other datasets by default
    return true;
}

/**
 * Determines whether a series label should be included based on shift settings.
 */
export function shouldIncludeShiftedSeries(
    label: string,
    showShifted: boolean,
    showShiftedTestNumbers: boolean = true
): boolean {
    const shifted = isShiftedSeries(label);
    if (shifted && (!showShifted || !showShiftedTestNumbers)) {
        return false;
    }

    return true;
}
