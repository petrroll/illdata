import { describe, test, expect } from "bun:test";
import { sortTooltipItems, type TooltipItem } from "./tooltip-formatting";

describe("sortTooltipItems", () => {
    test("sorts by type first, then by value within type", () => {
        const items: TooltipItem[] = [
            {
                dataset: { label: "PCR Positivity" },
                parsed: { x: 0, y: 5.5 },
                datasetIndex: 0
            },
            {
                dataset: { label: "PCR Positivity" },
                parsed: { x: 0, y: 10.2 },
                datasetIndex: 1
            },
            {
                dataset: { label: "Antigen Positivity" },
                parsed: { x: 0, y: 3.1 },
                datasetIndex: 2
            },
            {
                dataset: { label: "Positive Tests" },
                parsed: { x: 0, y: 100 },
                datasetIndex: 3
            }
        ];
        
        const sorted = sortTooltipItems(items);
        
        // Check type ordering (positivity before test numbers)
        expect(sorted[0].dataset.label).toContain("Positivity");
        expect(sorted[1].dataset.label).toContain("Positivity");
        expect(sorted[2].dataset.label).toContain("Positivity");
        expect(sorted[3].dataset.label).toBe("Positive Tests");
        
        // Check value ordering within positivity type (highest first)
        expect(sorted[0].parsed.y).toBe(10.2); // PCR with 10.2
        expect(sorted[1].parsed.y).toBe(5.5);  // PCR with 5.5
        expect(sorted[2].parsed.y).toBe(3.1);  // Antigen with 3.1
    });
    
    test("handles shifted series correctly", () => {
        const items: TooltipItem[] = [
            {
                dataset: { label: "PCR Positivity shifted by 1 wave -347d" },
                parsed: { x: 0, y: 8.0 },
                datasetIndex: 0
            },
            {
                dataset: { label: "PCR Positivity" },
                parsed: { x: 0, y: 5.0 },
                datasetIndex: 1
            },
            {
                dataset: { label: "Antigen Positivity" },
                parsed: { x: 0, y: 10.0 },
                datasetIndex: 2
            }
        ];
        
        const sorted = sortTooltipItems(items);
        
        // Regular positivity should come before shifted
        expect(sorted[0].dataset.label).toBe("Antigen Positivity");
        expect(sorted[0].parsed.y).toBe(10.0);
        expect(sorted[1].dataset.label).toBe("PCR Positivity");
        expect(sorted[1].parsed.y).toBe(5.0);
        expect(sorted[2].dataset.label).toContain("shifted");
        expect(sorted[2].parsed.y).toBe(8.0);
    });
    
    test("handles averaged series correctly", () => {
        const items: TooltipItem[] = [
            {
                dataset: { label: "PCR Positivity (28d avg)" },
                parsed: { x: 0, y: 7.5 },
                datasetIndex: 0
            },
            {
                dataset: { label: "PCR Positivity" },
                parsed: { x: 0, y: 5.0 },
                datasetIndex: 1
            },
            {
                dataset: { label: "PCR Positivity shifted by -180d" },
                parsed: { x: 0, y: 8.0 },
                datasetIndex: 2
            }
        ];
        
        const sorted = sortTooltipItems(items);
        
        // Order should be: regular, shifted, averaged
        expect(sorted[0].dataset.label).toBe("PCR Positivity");
        expect(sorted[1].dataset.label).toContain("shifted");
        expect(sorted[2].dataset.label).toContain("avg");
    });
    
    test("handles NaN values by placing them at the end", () => {
        const items: TooltipItem[] = [
            {
                dataset: { label: "Series A" },
                parsed: { x: 0, y: 5.0 },
                datasetIndex: 0
            },
            {
                dataset: { label: "Series B" },
                parsed: { x: 0, y: NaN },
                datasetIndex: 1
            },
            {
                dataset: { label: "Series C" },
                parsed: { x: 0, y: 10.0 },
                datasetIndex: 2
            }
        ];
        
        const sorted = sortTooltipItems(items);
        
        // NaN should be at the end
        expect(sorted[0].parsed.y).toBe(10.0);
        expect(sorted[1].parsed.y).toBe(5.0);
        expect(isNaN(sorted[2].parsed.y)).toBe(true);
    });
    
    test("handles multiple NaN values", () => {
        const items: TooltipItem[] = [
            {
                dataset: { label: "Series A" },
                parsed: { x: 0, y: NaN },
                datasetIndex: 0
            },
            {
                dataset: { label: "Series B" },
                parsed: { x: 0, y: NaN },
                datasetIndex: 1
            },
            {
                dataset: { label: "Series C" },
                parsed: { x: 0, y: 5.0 },
                datasetIndex: 2
            }
        ];
        
        const sorted = sortTooltipItems(items);
        
        // Non-NaN should come first
        expect(sorted[0].parsed.y).toBe(5.0);
        expect(isNaN(sorted[1].parsed.y)).toBe(true);
        expect(isNaN(sorted[2].parsed.y)).toBe(true);
    });
    
    test("sorts within same type by value descending", () => {
        const items: TooltipItem[] = [
            {
                dataset: { label: "Adenovirus Positivity" },
                parsed: { x: 0, y: 0.212 },
                datasetIndex: 0
            },
            {
                dataset: { label: "Chřipka Positivity" },
                parsed: { x: 0, y: 5.508 },
                datasetIndex: 1
            },
            {
                dataset: { label: "RSV Positivity" },
                parsed: { x: 0, y: 4.237 },
                datasetIndex: 2
            },
            {
                dataset: { label: "HMPV Positivity" },
                parsed: { x: 0, y: 5.932 },
                datasetIndex: 3
            }
        ];
        
        const sorted = sortTooltipItems(items);
        
        // All are same type (positivity), should be sorted by value descending
        expect(sorted[0].parsed.y).toBe(5.932); // HMPV
        expect(sorted[1].parsed.y).toBe(5.508); // Chřipka
        expect(sorted[2].parsed.y).toBe(4.237); // RSV
        expect(sorted[3].parsed.y).toBe(0.212); // Adenovirus
    });
});
