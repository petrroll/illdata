import { describe, test, expect } from "bun:test";

/**
 * Extracts the shift amount in days from a series label.
 * This is a copy of the function from main.ts for testing purposes.
 */
function extractShiftFromLabel(label: string): number | null {
    // Pattern 1: Wave-based shift: "shifted by X wave(s) -347d" or "shifted by X wave(s) 347d"
    const wavePattern = /shifted by \d+ waves? (-?\d+)d/;
    const waveMatch = label.match(wavePattern);
    if (waveMatch) {
        return parseInt(waveMatch[1], 10);
    }
    
    // Pattern 2: Custom day shift: "shifted by -180d" or "shifted by 180d"
    const dayPattern = /shifted by (-?\d+)d/;
    const dayMatch = label.match(dayPattern);
    if (dayMatch) {
        return parseInt(dayMatch[1], 10);
    }
    
    return null;
}

describe("extractShiftFromLabel Tests", () => {
    test("extracts positive shift from wave-based label", () => {
        const label = "PCR Positivity (28d avg) shifted by 1 wave 347d";
        expect(extractShiftFromLabel(label)).toBe(347);
    });

    test("extracts negative shift from wave-based label", () => {
        const label = "PCR Positivity (28d avg) shifted by 1 wave -347d";
        expect(extractShiftFromLabel(label)).toBe(-347);
    });

    test("extracts positive shift from custom day shift label", () => {
        const label = "PCR Positivity (28d avg) shifted by 180d";
        expect(extractShiftFromLabel(label)).toBe(180);
    });

    test("extracts negative shift from custom day shift label", () => {
        const label = "PCR Positivity (28d avg) shifted by -180d";
        expect(extractShiftFromLabel(label)).toBe(-180);
    });

    test("handles wave label with 'waves' plural", () => {
        const label = "Influenza Positivity shifted by 2 waves -600d";
        expect(extractShiftFromLabel(label)).toBe(-600);
    });

    test("returns null for non-shifted series", () => {
        const label = "PCR Positivity (28d avg)";
        expect(extractShiftFromLabel(label)).toBe(null);
    });

    test("returns null for raw series", () => {
        const label = "PCR Positivity";
        expect(extractShiftFromLabel(label)).toBe(null);
    });

    test("returns null for extreme series", () => {
        const label = "PCR Positivity (28d avg) - Maxima";
        expect(extractShiftFromLabel(label)).toBe(null);
    });

    test("handles zero shift", () => {
        const label = "PCR Positivity (28d avg) shifted by 0d";
        expect(extractShiftFromLabel(label)).toBe(0);
    });

    test("handles large positive shift", () => {
        const label = "Influenza shifted by 3 waves 1000d";
        expect(extractShiftFromLabel(label)).toBe(1000);
    });

    test("handles large negative shift", () => {
        const label = "Influenza shifted by -1000d";
        expect(extractShiftFromLabel(label)).toBe(-1000);
    });
});
