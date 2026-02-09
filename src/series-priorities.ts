/**
 * Series type priority constants used for sorting.
 * Lower numbers appear first in sorted order.
 * 
 * Priority groups:
 * - 0-2: Positivity series (regular, shifted, averaged)
 * - 3-4: Non-shifted test numbers (positive, negative)
 * - 5-6: Shifted test numbers (positive, negative)
 * - 7: Other types
 */
export const PRIORITY_POSITIVITY = 0;
export const PRIORITY_POSITIVITY_SHIFTED = 1;
export const PRIORITY_POSITIVITY_AVERAGED = 2;
export const PRIORITY_POSITIVE_TESTS = 3;
export const PRIORITY_NEGATIVE_TESTS = 4;
export const PRIORITY_POSITIVE_TESTS_SHIFTED = 5;
export const PRIORITY_NEGATIVE_TESTS_SHIFTED = 6;
export const PRIORITY_OTHER = 7;

/**
 * Import the helper functions that detect series types
 */
import { 
    isPositivitySeries, 
    isShiftedSeries, 
    isAveragedSeries,
    isPositiveTestSeries,
    isNegativeTestSeries
} from './series-utils.js';

/**
 * Determines the type priority of a series label.
 * Lower numbers appear first in the sorted order.
 * Uses language-neutral helper functions from series-utils.ts
 * 
 * @param label - The series label to analyze
 * @returns Priority number (0-7)
 */
export function getSeriesTypePriority(label: string): number {
    // Use language-neutral helper functions that normalize the label internally
    const isPositivity = isPositivitySeries(label);
    const isShifted = isShiftedSeries(label);
    const isAveraged = isAveragedSeries(label);
    const isPositiveTest = isPositiveTestSeries(label);
    const isNegativeTest = isNegativeTestSeries(label);
    
    // Determine priority based on series type
    if (isPositiveTest) {
        return isShifted ? PRIORITY_POSITIVE_TESTS_SHIFTED : PRIORITY_POSITIVE_TESTS;
    }
    if (isNegativeTest) {
        return isShifted ? PRIORITY_NEGATIVE_TESTS_SHIFTED : PRIORITY_NEGATIVE_TESTS;
    }
    if (isPositivity) {
        // Shifted positivity takes precedence over averaged
        if (isShifted) {
            return PRIORITY_POSITIVITY_SHIFTED;
        }
        if (isAveraged) {
            return PRIORITY_POSITIVITY_AVERAGED;
        }
        return PRIORITY_POSITIVITY;
    }
    
    return PRIORITY_OTHER;
}
