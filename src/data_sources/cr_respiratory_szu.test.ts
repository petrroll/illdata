import { describe, expect, it } from "bun:test";
import { weekToDate, czechWeekToIsoWeek, computeSzuRespiratoryData } from "./cr_respiratory_szu";
import type { VirusWeekData } from "./cr_respiratory_szu";

describe("weekToDate", () => {
    it("should convert ISO week to Monday date", () => {
        // Week 1 of 2025 starts on Monday, December 30, 2024
        expect(weekToDate("2025-W01")).toBe("2024-12-30");
        
        // Week 2 of 2025 starts on Monday, January 6, 2025
        expect(weekToDate("2025-W02")).toBe("2025-01-06");
        
        // Week 40 of 2025
        expect(weekToDate("2025-W40")).toBe("2025-09-29");
    });
    
    it("should throw error for invalid format", () => {
        expect(() => weekToDate("2025-40")).toThrow("Invalid ISO week format");
        expect(() => weekToDate("invalid")).toThrow("Invalid ISO week format");
    });
});

describe("czechWeekToIsoWeek", () => {
    it("should convert Czech week format to ISO week", () => {
        expect(czechWeekToIsoWeek("1.KT 2025")).toBe("2025-W01");
        expect(czechWeekToIsoWeek("40.KT 2025")).toBe("2025-W40");
        expect(czechWeekToIsoWeek("52.KT 2024")).toBe("2024-W52");
    });
    
    it("should throw error for invalid format", () => {
        expect(() => czechWeekToIsoWeek("invalid")).toThrow("Invalid Czech week format");
        expect(() => czechWeekToIsoWeek("KT 1 2025")).toThrow("Invalid Czech week format");
    });
});

describe("computeSzuRespiratoryData", () => {
    it("should return empty data for empty input", () => {
        const result = computeSzuRespiratoryData([]);
        expect(result.dates).toEqual([]);
        expect(result.series).toEqual([]);
    });
    
    it("should create time series for all virus types", () => {
        const mockData: VirusWeekData[] = [
            {
                week: "2025-W01",
                date: "2024-12-30",
                influenzaA: 10,
                influenzaB: 5,
                rsv: 15,
                adenovirus: 3,
                rhinovirus: 20,
                parainfluenza: 2,
                coronavirus: 1,
                totalTests: 100
            },
            {
                week: "2025-W02",
                date: "2025-01-06",
                influenzaA: 12,
                influenzaB: 6,
                rsv: 18,
                adenovirus: 4,
                rhinovirus: 22,
                parainfluenza: 3,
                coronavirus: 2,
                totalTests: 120
            }
        ];
        
        const result = computeSzuRespiratoryData(mockData);
        
        expect(result.dates).toEqual(["2024-12-30", "2025-01-06"]);
        expect(result.series).toHaveLength(7);
        
        // Check Influenza A series
        const influenzaA = result.series.find(s => s.name === "Influenza A");
        expect(influenzaA).toBeDefined();
        expect(influenzaA?.values[0]).toEqual({ positive: 10, tests: 100 });
        expect(influenzaA?.values[1]).toEqual({ positive: 12, tests: 120 });
        expect(influenzaA?.frequencyInDays).toBe(7);
        expect(influenzaA?.dataType).toBe('positivity');
        
        // Check RSV series
        const rsv = result.series.find(s => s.name === "RSV");
        expect(rsv).toBeDefined();
        expect(rsv?.values[0]).toEqual({ positive: 15, tests: 100 });
        expect(rsv?.values[1]).toEqual({ positive: 18, tests: 120 });
    });
    
    it("should handle zero values correctly", () => {
        const mockData: VirusWeekData[] = [
            {
                week: "2025-W01",
                date: "2024-12-30",
                influenzaA: 0,
                influenzaB: 0,
                rsv: 0,
                adenovirus: 0,
                rhinovirus: 0,
                parainfluenza: 0,
                coronavirus: 0,
                totalTests: 50
            }
        ];
        
        const result = computeSzuRespiratoryData(mockData);
        
        expect(result.dates).toEqual(["2024-12-30"]);
        const influenzaA = result.series.find(s => s.name === "Influenza A");
        expect(influenzaA?.values[0]).toEqual({ positive: 0, tests: 50 });
    });
});
