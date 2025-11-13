// Series utility functions for identifying and categorizing data series
// Extracted from main.ts to reduce special-casing based on string matching

import { normalizeSeriesName } from './locales';

// Constants for dataset filtering
export const SHIFTED_SERIES_IDENTIFIER = 'shifted';
export const TEST_NUMBERS_IDENTIFIER = 'tests';
export const MIN_MAX_IDENTIFIER = ['min', 'max'];

/**
 * Series metadata and classification functions
 */

/**
 * Checks if a series is a shifted series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is shifted
 */
export function isShiftedSeries(label: string): boolean {
    const normalizedLabel = normalizeSeriesName(label);
    return normalizedLabel.toLowerCase().includes(SHIFTED_SERIES_IDENTIFIER);
}

/**
 * Checks if a series is a test number series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is a test number series
 */
export function isTestNumberSeries(label: string): boolean {
    const normalizedLabel = normalizeSeriesName(label);
    return normalizedLabel.toLowerCase().includes(TEST_NUMBERS_IDENTIFIER);
}

/**
 * Checks if a series is a min/max series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is a min/max series
 */
export function isMinMaxSeries(label: string): boolean {
    const normalizedLabel = normalizeSeriesName(label);
    const lowerLabel = normalizedLabel.toLowerCase();
    return MIN_MAX_IDENTIFIER.some(id => lowerLabel.includes(id));
}

/**
 * Checks if a series is a positivity series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series is a positivity series
 */
export function isPositivitySeries(label: string): boolean {
    const normalizedLabel = normalizeSeriesName(label);
    return normalizedLabel.toLowerCase().includes('positivity');
}

/**
 * Checks if a series is a positive test series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series represents positive tests
 */
export function isPositiveTestSeries(label: string): boolean {
    const normalizedLabel = normalizeSeriesName(label);
    return normalizedLabel.includes(' - Positive Tests');
}

/**
 * Checks if a series is a negative test series based on its label
 * @param label - Series label (in any language)
 * @returns True if the series represents negative tests
 */
export function isNegativeTestSeries(label: string): boolean {
    const normalizedLabel = normalizeSeriesName(label);
    return normalizedLabel.includes(' - Negative Tests');
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
