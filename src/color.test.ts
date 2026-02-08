import { describe, test, expect } from "bun:test";
import { getColorBaseSeriesName } from "./utils";
import { adjustColorForTestBars } from "./color";

describe("Color Base Series Name Extraction Tests", () => {
    test("extracts base name from raw series", () => {
        expect(getColorBaseSeriesName("PCR Positivity")).toBe("PCR Positivity");
        expect(getColorBaseSeriesName("Antigen Positivity")).toBe("Antigen Positivity");
    });

    test("extracts base name from averaged series", () => {
        expect(getColorBaseSeriesName("PCR Positivity (28d avg)")).toBe("PCR Positivity");
        expect(getColorBaseSeriesName("Antigen Positivity (28d avg)")).toBe("Antigen Positivity");
        expect(getColorBaseSeriesName("Influenza Positivity (7d avg)")).toBe("Influenza Positivity");
    });

    test("extracts base name from shifted series with wave alignment", () => {
        expect(getColorBaseSeriesName("PCR Positivity (28d avg) shifted by 1 wave -347d")).toBe("PCR Positivity");
        expect(getColorBaseSeriesName("Antigen Positivity (28d avg) shifted by 1 wave -347d")).toBe("Antigen Positivity");
        expect(getColorBaseSeriesName("PCR Positivity (28d avg) shifted by 2 waves -694d")).toBe("PCR Positivity");
    });

    test("extracts base name from shifted series with custom alignment", () => {
        expect(getColorBaseSeriesName("PCR Positivity (28d avg) shifted by -300d")).toBe("PCR Positivity");
        expect(getColorBaseSeriesName("Antigen Positivity (28d avg) shifted by 100d")).toBe("Antigen Positivity");
    });

    test("extracts base name from extreme series", () => {
        expect(getColorBaseSeriesName("PCR Positivity (28d avg) maxima over 84d")).toBe("PCR Positivity");
        expect(getColorBaseSeriesName("Antigen Positivity (28d avg) minima over 84d")).toBe("Antigen Positivity");
    });

    test("handles test number series names", () => {
        expect(getColorBaseSeriesName("PCR Positivity - Positive Tests")).toBe("PCR Positivity - Positive Tests");
        expect(getColorBaseSeriesName("Antigen Positivity - Negative Tests")).toBe("Antigen Positivity - Negative Tests");
    });

    test("handles complex series names with multiple components", () => {
        expect(
            getColorBaseSeriesName("PCR Positivity (28d avg) shifted by 1 wave -347d")
        ).toBe("PCR Positivity");
        
        expect(
            getColorBaseSeriesName("Influenza Positivity (14d avg) shifted by 2 waves -280d")
        ).toBe("Influenza Positivity");
    });

    test("consistent base name regardless of shift variation", () => {
        const variations = [
            "PCR Positivity",
            "PCR Positivity (28d avg)",
            "PCR Positivity (28d avg) shifted by 1 wave -347d",
            "PCR Positivity (28d avg) shifted by 2 waves -694d",
            "PCR Positivity (28d avg) shifted by -300d",
            "PCR Positivity (28d avg) shifted by 100d",
        ];
        
        const baseNames = variations.map(getColorBaseSeriesName);
        const uniqueBaseNames = Array.from(new Set(baseNames));
        
        expect(uniqueBaseNames).toEqual(["PCR Positivity"]);
    });

    test("different series have different base names", () => {
        const series = [
            "PCR Positivity (28d avg) shifted by 1 wave -347d",
            "Antigen Positivity (28d avg) shifted by 1 wave -347d",
            "Influenza Positivity (28d avg) shifted by 1 wave -347d",
        ];
        
        const baseNames = series.map(getColorBaseSeriesName);
        
        expect(baseNames).toEqual([
            "PCR Positivity",
            "Antigen Positivity",
            "Influenza Positivity",
        ]);
    });
});

describe("adjustColorForTestBars Tests", () => {
    test("returns a valid hex color for positive tests", () => {
        const result = adjustColorForTestBars("#1f77b4", true);
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    test("returns a valid hex color for negative tests", () => {
        const result = adjustColorForTestBars("#1f77b4", false);
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    test("positive and negative produce different colors", () => {
        const positive = adjustColorForTestBars("#1f77b4", true);
        const negative = adjustColorForTestBars("#1f77b4", false);
        expect(positive).not.toBe(negative);
    });

    test("handles different input colors", () => {
        const colors = ["#d62728", "#2ca02c", "#9467bd"];
        colors.forEach(color => {
            const result = adjustColorForTestBars(color, true);
            expect(result).toMatch(/^#[0-9a-f]{6}$/);
        });
    });
});
