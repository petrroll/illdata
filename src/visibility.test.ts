import { describe, test, expect } from "bun:test";

/**
 * These tests verify the visibility preservation logic when alignment changes.
 * They simulate the scenario described in the issue where series visibility
 * should be preserved across alignment changes.
 */

const SHIFTED_SERIES_IDENTIFIER = 'shifted';
const TEST_NUMBERS_IDENTIFIER = 'tests';
const MIN_MAX_IDENTIFIER = ['min', 'max'];

function getBaseSeriesName(label: string): string {
    if (!label.toLowerCase().includes(SHIFTED_SERIES_IDENTIFIER)) {
        return label;
    }
    
    return label
        .replace(/ shifted by \d+ waves? -?\d+d/, ' shifted by N waves')
        .replace(/ shifted by -?\d+d \(custom\)/, ' shifted by N (custom)')
        .trim();
}

function getVisibilityDefault(label: string, showShifted: boolean = true, showTestNumbers: boolean = true): boolean {
    const lowerLabel = label.toLowerCase();
    
    if (MIN_MAX_IDENTIFIER.some(id => lowerLabel.includes(id))) {
        return false;
    }
    
    if (lowerLabel.includes(SHIFTED_SERIES_IDENTIFIER)) {
        return showShifted;
    }

    if (lowerLabel.includes(TEST_NUMBERS_IDENTIFIER)) {
        return showTestNumbers;
    }

    return true;
}

/**
 * Simulates the visibility preservation logic from main.ts
 */
function preserveVisibility(
    storedVisibility: { [key: string]: boolean },
    currentSeriesNames: string[],
    showShifted: boolean = true,
    showTestNumbers: boolean = true
): { [key: string]: boolean } {
    const cfg = { datasetVisibility: { ...storedVisibility } };
    const validSeriesNames = new Set(currentSeriesNames);
    
    // Build base name map
    const baseToCurrentSeriesMap = new Map<string, string>();
    validSeriesNames.forEach(seriesName => {
        const baseName = getBaseSeriesName(seriesName);
        baseToCurrentSeriesMap.set(baseName, seriesName);
    });
    
    // Initialize visibility for new series
    validSeriesNames.forEach(seriesName => {
        if (cfg.datasetVisibility[seriesName] === undefined) {
            const baseName = getBaseSeriesName(seriesName);
            
            // Find all previous series with the same base name
            const allPreviousMatches = Object.keys(cfg.datasetVisibility).filter(key => {
                return getBaseSeriesName(key) === baseName;
            });
            
            if (allPreviousMatches.length > 0) {
                // Use the MOST RECENT match (last in the array)
                const previousVisibility = allPreviousMatches[allPreviousMatches.length - 1];
                cfg.datasetVisibility[seriesName] = cfg.datasetVisibility[previousVisibility];
            } else {
                cfg.datasetVisibility[seriesName] = getVisibilityDefault(seriesName, showShifted, showTestNumbers);
            }
        }
    });
    
    // Clean up old series
    Object.keys(cfg.datasetVisibility).forEach(seriesName => {
        if (!validSeriesNames.has(seriesName)) {
            const baseName = getBaseSeriesName(seriesName);
            const currentSeriesWithSameBase = baseToCurrentSeriesMap.get(baseName);
            
            if (currentSeriesWithSameBase && cfg.datasetVisibility[currentSeriesWithSameBase] !== undefined) {
                // Already transferred, safe to remove
                delete cfg.datasetVisibility[seriesName];
            } else if (!baseToCurrentSeriesMap.has(baseName)) {
                // Base series no longer exists
                delete cfg.datasetVisibility[seriesName];
            }
        }
    });
    
    return cfg.datasetVisibility;
}

describe("Visibility Preservation Tests", () => {
    test("preserves visibility when alignment changes by 1 day", () => {
        // Initial state: user has hidden some series
        const initialVisibility = {
            "PCR Positivity": false,
            "PCR Positivity (28d avg)": true,
            "PCR Positivity (28d avg) shifted by 1 wave -347d": true,
            "Antigen Positivity": false,
            "Antigen Positivity (28d avg)": false,
            "Antigen Positivity (28d avg) shifted by 1 wave -347d": false,
        };
        
        // After alignment changes: shift changes by 1 day
        const newSeriesNames = [
            "PCR Positivity",
            "PCR Positivity (28d avg)",
            "PCR Positivity (28d avg) shifted by 1 wave -348d",  // Changed
            "Antigen Positivity",
            "Antigen Positivity (28d avg)",
            "Antigen Positivity (28d avg) shifted by 1 wave -348d",  // Changed
        ];
        
        const result = preserveVisibility(initialVisibility, newSeriesNames);
        
        // Verify visibility is preserved
        expect(result["PCR Positivity"]).toBe(false);
        expect(result["PCR Positivity (28d avg)"]).toBe(true);
        expect(result["PCR Positivity (28d avg) shifted by 1 wave -348d"]).toBe(true);
        expect(result["Antigen Positivity"]).toBe(false);
        expect(result["Antigen Positivity (28d avg)"]).toBe(false);
        expect(result["Antigen Positivity (28d avg) shifted by 1 wave -348d"]).toBe(false);
        
        // Verify old series are cleaned up
        expect(result["PCR Positivity (28d avg) shifted by 1 wave -347d"]).toBeUndefined();
        expect(result["Antigen Positivity (28d avg) shifted by 1 wave -347d"]).toBeUndefined();
    });
    
    test("uses most recent visibility when multiple old versions exist", () => {
        // Simulate scenario where old versions accumulated
        const storedVisibility = {
            "PCR Positivity (28d avg) shifted by 1 wave -345d": false,  // Oldest
            "PCR Positivity (28d avg) shifted by 1 wave -346d": false,
            "PCR Positivity (28d avg) shifted by 1 wave -347d": true,   // Most recent (user changed it)
        };
        
        const newSeriesNames = [
            "PCR Positivity (28d avg) shifted by 1 wave -348d",  // New
        ];
        
        const result = preserveVisibility(storedVisibility, newSeriesNames);
        
        // Should inherit from most recent (-347d), not oldest (-345d)
        expect(result["PCR Positivity (28d avg) shifted by 1 wave -348d"]).toBe(true);
        
        // Old versions should be cleaned up
        expect(result["PCR Positivity (28d avg) shifted by 1 wave -345d"]).toBeUndefined();
        expect(result["PCR Positivity (28d avg) shifted by 1 wave -346d"]).toBeUndefined();
        expect(result["PCR Positivity (28d avg) shifted by 1 wave -347d"]).toBeUndefined();
    });
    
    test("preserves visibility across multiple alignment changes", () => {
        let visibility: { [key: string]: boolean } = {
            "PCR Positivity (28d avg) shifted by 1 wave -347d": false,
        };
        
        // Simulate changing alignment 5 times
        for (let i = 348; i <= 352; i++) {
            const seriesNames = [`PCR Positivity (28d avg) shifted by 1 wave -${i}d`];
            visibility = preserveVisibility(visibility, seriesNames);
            
            // Should remain hidden throughout
            expect(visibility[`PCR Positivity (28d avg) shifted by 1 wave -${i}d`]).toBe(false);
        }
        
        // Only the latest should remain
        expect(Object.keys(visibility)).toEqual(["PCR Positivity (28d avg) shifted by 1 wave -352d"]);
    });
    
    test("preserves visibility when switching between days and wave alignment modes", () => {
        // User starts with "days" mode
        const initialVisibility = {
            "PCR Positivity (28d avg) shifted by -370d (custom)": false,
        };
        
        // User switches to "maxima" mode (different naming format)
        const newSeriesNames = [
            "PCR Positivity (28d avg) shifted by 1 wave -347d",
        ];
        
        const result = preserveVisibility(initialVisibility, newSeriesNames);
        
        // These are different alignment modes with different naming formats
        // The base names are different, so they don't inherit from each other
        expect(result["PCR Positivity (28d avg) shifted by 1 wave -347d"]).toBe(true);  // Default
        
        // Old mode should be cleaned up because base name doesn't match
        expect(result["PCR Positivity (28d avg) shifted by -370d (custom)"]).toBeUndefined();
    });
    
    test("handles test number series correctly", () => {
        const initialVisibility = {
            "PCR Positivity - Positive Tests": false,
            "PCR Positivity - Negative Tests": false,
        };
        
        const newSeriesNames = [
            "PCR Positivity - Positive Tests",
            "PCR Positivity - Negative Tests",
        ];
        
        const result = preserveVisibility(initialVisibility, newSeriesNames);
        
        // Test series should preserve their hidden state
        expect(result["PCR Positivity - Positive Tests"]).toBe(false);
        expect(result["PCR Positivity - Negative Tests"]).toBe(false);
    });
});

describe("getBaseSeriesName Tests", () => {
    test("normalizes shifted series names correctly", () => {
        expect(getBaseSeriesName("PCR Positivity (28d avg) shifted by 1 wave -347d"))
            .toBe("PCR Positivity (28d avg) shifted by N waves");
        
        expect(getBaseSeriesName("PCR Positivity (28d avg) shifted by 2 waves -694d"))
            .toBe("PCR Positivity (28d avg) shifted by N waves");
        
        expect(getBaseSeriesName("PCR Positivity (28d avg) shifted by -370d (custom)"))
            .toBe("PCR Positivity (28d avg) shifted by N (custom)");
    });
    
    test("returns non-shifted series names unchanged", () => {
        expect(getBaseSeriesName("PCR Positivity")).toBe("PCR Positivity");
        expect(getBaseSeriesName("PCR Positivity (28d avg)")).toBe("PCR Positivity (28d avg)");
    });
    
    test("handles positive shift values", () => {
        expect(getBaseSeriesName("PCR Positivity shifted by 1 wave 100d"))
            .toBe("PCR Positivity shifted by N waves");
        
        expect(getBaseSeriesName("PCR Positivity shifted by 100d (custom)"))
            .toBe("PCR Positivity shifted by N (custom)");
    });
});
