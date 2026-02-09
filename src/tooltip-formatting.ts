// Tooltip formatting utilities for Chart.js tooltips
// Handles sorting tooltip items by type and value

import { getSeriesTypePriority } from './series-priorities';

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
