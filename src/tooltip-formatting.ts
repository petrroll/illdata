// Tooltip formatting utilities for Chart.js tooltips
// Handles sorting tooltip items by type and value, and identifying the closest series

import { 
    isPositivitySeries, 
    isShiftedSeries, 
    isAveragedSeries, 
    isPositiveTestSeries, 
    isNegativeTestSeries 
} from './series-utils';

/**
 * Tooltip item interface matching Chart.js structure
 */
export interface TooltipItem {
    dataset: {
        label?: string;
        [key: string]: any;
    };
    parsed: {
        x: number;
        y: number;
    };
    datasetIndex: number;
    [key: string]: any;
}

/**
 * Gets the type priority for a series label.
 * Lower numbers appear first in the sorted order.
 * This mirrors the logic in utils.ts compareLabels but returns just the priority number.
 */
function getSeriesTypePriority(label: string): number {
    const PRIORITY_POSITIVITY = 0;
    const PRIORITY_POSITIVITY_SHIFTED = 1;
    const PRIORITY_POSITIVITY_AVERAGED = 2;
    const PRIORITY_POSITIVE_TESTS = 3;
    const PRIORITY_NEGATIVE_TESTS = 4;
    const PRIORITY_POSITIVE_TESTS_SHIFTED = 5;
    const PRIORITY_NEGATIVE_TESTS_SHIFTED = 6;
    const PRIORITY_OTHER = 7;
    
    const isPositivity = isPositivitySeries(label);
    const isShifted = isShiftedSeries(label);
    const isAveraged = isAveragedSeries(label);
    const isPositiveTest = isPositiveTestSeries(label);
    const isNegativeTest = isNegativeTestSeries(label);
    
    if (isPositiveTest) {
        return isShifted ? PRIORITY_POSITIVE_TESTS_SHIFTED : PRIORITY_POSITIVE_TESTS;
    }
    if (isNegativeTest) {
        return isShifted ? PRIORITY_NEGATIVE_TESTS_SHIFTED : PRIORITY_NEGATIVE_TESTS;
    }
    if (isPositivity) {
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

/**
 * Compares two tooltip items for sorting.
 * Used as a comparison function for Array.sort() or Chart.js itemSort callback.
 * 
 * Sorts by:
 * 1. Type/category (positivity, shifted positivity, averaged, tests, etc.)
 * 2. Value within each type (highest first)
 * 
 * @param a - First tooltip item
 * @param b - Second tooltip item
 * @returns Negative if a comes first, positive if b comes first, 0 if equal
 */
export function compareTooltipItems(a: TooltipItem, b: TooltipItem): number {
    const labelA = a.dataset.label || '';
    const labelB = b.dataset.label || '';
    
    // First, compare by type/category
    const priorityA = getSeriesTypePriority(labelA);
    const priorityB = getSeriesTypePriority(labelB);
    
    if (priorityA !== priorityB) {
        return priorityA - priorityB;
    }
    
    // Within same type, sort by value (highest first)
    const valueA = a.parsed.y;
    const valueB = b.parsed.y;
    
    // Handle NaN values (put them at the end)
    if (isNaN(valueA) && isNaN(valueB)) return 0;
    if (isNaN(valueA)) return 1;
    if (isNaN(valueB)) return -1;
    
    // Sort descending (highest first)
    return valueB - valueA;
}

/**
 * Sorts tooltip items by:
 * 1. Type/category (positivity, shifted positivity, averaged, tests, etc.)
 * 2. Value within each type (highest first)
 * 
 * @param items - Array of tooltip items to sort
 * @returns Sorted array of tooltip items
 */
export function sortTooltipItems(items: TooltipItem[]): TooltipItem[] {
    return [...items].sort(compareTooltipItems);
}

/**
 * Finds the closest tooltip item to the cursor position.
 * In Chart.js with mode: 'index', all items share the same x position,
 * so we find the one with y value closest to the cursor's y position.
 * 
 * Uses hysteresis to prevent flickering when cursor is between two close values.
 * The new closest item must be at least 5 pixels closer to become selected.
 * 
 * @param items - Array of tooltip items
 * @param cursorY - The y-coordinate of the cursor (in pixel space)
 * @param chart - The Chart.js chart instance
 * @param previousClosest - The previously selected datasetIndex (for hysteresis)
 * @returns datasetIndex of the closest item, or -1 if none found
 */
export function findClosestItem(items: TooltipItem[], cursorY: number, chart: any, previousClosest: number = -1): number {
    if (items.length === 0) return -1;
    
    const HYSTERESIS_PIXELS = 5; // Minimum pixel difference to switch selection
    
    let closestDatasetIndex = -1;
    let closestDistance = Infinity;
    let previousDistance = Infinity;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const value = item.parsed.y;
        
        // Skip items with NaN values
        if (isNaN(value)) continue;
        
        // Get the correct y-scale for this dataset
        // Datasets can use either 'y' (left axis) or 'y1' (right axis)
        const yAxisID = item.dataset.yAxisID || 'y';
        const yScale = chart.scales[yAxisID];
        if (!yScale) continue;
        
        const pixelY = yScale.getPixelForValue(value);
        const distance = Math.abs(pixelY - cursorY);
        
        // Track distance to the previously selected item
        if (item.datasetIndex === previousClosest) {
            previousDistance = distance;
        }
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestDatasetIndex = item.datasetIndex;
        }
    }
    
    // Apply hysteresis: only switch if new item is significantly closer
    if (previousClosest !== -1 && previousDistance !== Infinity) {
        // If previous selection is still reasonably close, keep it
        if (previousDistance - closestDistance < HYSTERESIS_PIXELS) {
            return previousClosest;
        }
    }
    
    return closestDatasetIndex;
}
