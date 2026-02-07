// Tooltip utility functions
// Extracted from main.ts for testability and reuse

import { normalizeSeriesName } from './locales';

/**
 * Extracts the shift amount in days from a series label.
 * 
 * Handles two label formats:
 * 1. Wave-based shifts: "... shifted by X wave -347d" or "... shifted by X wave 347d"
 * 2. Custom day shifts: "... shifted by -180d" or "... shifted by 180d"
 * 
 * @param label - The series label that may contain shift information (in any language)
 * @returns The shift amount in days, or null if no shift information found
 * 
 * Examples:
 * - "PCR Positivity (28d avg) shifted by 1 wave -347d" -> -347
 * - "PCR pozitivita (28d prům.) posunuto o 1 vlna -347d" -> -347
 * - "PCR Positivity (28d avg) shifted by -180d" -> -180
 * - "PCR Positivity (28d avg)" -> null
 */
export function extractShiftFromLabel(label: string): number | null {
    // Normalize to English first to handle Czech labels
    const normalizedLabel = normalizeSeriesName(label);
    
    // Pattern 1: Wave-based shift: "shifted by X wave(s) -347d" or "shifted by X wave(s) 347d"
    const wavePattern = /shifted by \d+ waves? (-?\d+)d/;
    const waveMatch = normalizedLabel.match(wavePattern);
    if (waveMatch) {
        return parseInt(waveMatch[1], 10);
    }
    
    // Pattern 2: Custom day shift: "shifted by -180d" or "shifted by 180d"
    const dayPattern = /shifted by (-?\d+)d/;
    const dayMatch = normalizedLabel.match(dayPattern);
    if (dayMatch) {
        return parseInt(dayMatch[1], 10);
    }
    
    return null;
}
