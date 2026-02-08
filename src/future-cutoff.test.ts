import { describe, test, expect } from 'bun:test';

/**
 * Tests for future data cutoff calculation logic.
 * This tests the algorithm used in main.ts updateChart() function
 * to determine how much future data to show based on the selected time range.
 */

// Helper function to calculate future cutoff (extracted logic from main.ts)
function calculateFutureCutoffDate(timeRange: string, includeFuture: boolean): Date | null {
    if (!includeFuture) {
        // When future is not included, cutoff at today
        return new Date(new Date().toISOString().split('T')[0]);
    }
    
    if (timeRange === "all") {
        // For "all" time range, no cutoff (return null to indicate no limit)
        return null;
    }
    
    // When includeFuture is true, show 2x the past time range as future
    const days = parseInt(timeRange);
    const futureCutoffDate = new Date();
    futureCutoffDate.setDate(futureCutoffDate.getDate() + (2 * days));
    return futureCutoffDate;
}

// Helper to get date string in YYYY-MM-DD format
function getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
}

describe('Future Data Cutoff Calculation', () => {
    test('should return today when includeFuture is false', () => {
        const today = new Date(new Date().toISOString().split('T')[0]);
        const cutoff = calculateFutureCutoffDate("90", false);
        
        expect(cutoff).not.toBeNull();
        expect(getDateString(cutoff!)).toBe(getDateString(today));
    });
    
    test('should return null for "all" time range with future included', () => {
        const cutoff = calculateFutureCutoffDate("all", true);
        expect(cutoff).toBeNull();
    });
    
    test('should return 2x timeRange days in future when includeFuture is true', () => {
        const timeRange = "90";
        const cutoff = calculateFutureCutoffDate(timeRange, true);
        
        expect(cutoff).not.toBeNull();
        
        // Expected: today + 180 days (2 * 90)
        const expected = new Date();
        expected.setDate(expected.getDate() + (2 * 90));
        
        expect(getDateString(cutoff!)).toBe(getDateString(expected));
    });
    
    test('should calculate correct future cutoff for 30 days', () => {
        const timeRange = "30";
        const cutoff = calculateFutureCutoffDate(timeRange, true);
        
        expect(cutoff).not.toBeNull();
        
        // Expected: today + 60 days (2 * 30)
        const expected = new Date();
        expected.setDate(expected.getDate() + (2 * 30));
        
        expect(getDateString(cutoff!)).toBe(getDateString(expected));
    });
    
    test('should calculate correct future cutoff for 180 days', () => {
        const timeRange = "180";
        const cutoff = calculateFutureCutoffDate(timeRange, true);
        
        expect(cutoff).not.toBeNull();
        
        // Expected: today + 360 days (2 * 180)
        const expected = new Date();
        expected.setDate(expected.getDate() + (2 * 180));
        
        expect(getDateString(cutoff!)).toBe(getDateString(expected));
    });
    
    test('should calculate correct future cutoff for 365 days', () => {
        const timeRange = "365";
        const cutoff = calculateFutureCutoffDate(timeRange, true);
        
        expect(cutoff).not.toBeNull();
        
        // Expected: today + 730 days (2 * 365)
        const expected = new Date();
        expected.setDate(expected.getDate() + (2 * 365));
        
        expect(getDateString(cutoff!)).toBe(getDateString(expected));
    });
    
    test('should calculate correct future cutoff for 730 days (2 years)', () => {
        const timeRange = "730";
        const cutoff = calculateFutureCutoffDate(timeRange, true);
        
        expect(cutoff).not.toBeNull();
        
        // Expected: today + 1460 days (2 * 730)
        const expected = new Date();
        expected.setDate(expected.getDate() + (2 * 730));
        
        expect(getDateString(cutoff!)).toBe(getDateString(expected));
    });
    
    test('should handle edge case of 1 day time range', () => {
        const timeRange = "1";
        const cutoff = calculateFutureCutoffDate(timeRange, true);
        
        expect(cutoff).not.toBeNull();
        
        // Expected: today + 2 days (2 * 1)
        const expected = new Date();
        expected.setDate(expected.getDate() + 2);
        
        expect(getDateString(cutoff!)).toBe(getDateString(expected));
    });
});

describe('Future Cutoff Date Index Calculation', () => {
    test('should find correct index when cutoff date is in the middle of dates array', () => {
        const today = new Date();
        const dates = [];
        
        // Create dates array: 100 days in past to 200 days in future
        for (let i = -100; i <= 200; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(getDateString(date));
        }
        
        // For 90 days time range with future included, cutoff should be at today + 180
        const futureCutoffDate = new Date(today);
        futureCutoffDate.setDate(today.getDate() + 180);
        const futureCutoffString = getDateString(futureCutoffDate);
        
        // Find the index where date > futureCutoffString
        const futureIdx = dates.findIndex(d => d > futureCutoffString);
        
        // Should find the index at position corresponding to +181 days from today
        expect(futureIdx).toBeGreaterThan(0);
        expect(futureIdx).toBe(100 + 181); // Start at -100, cutoff at +180, index at +181
    });
    
    test('should return -1 when cutoff date is beyond all dates', () => {
        const today = new Date();
        const dates = [];
        
        // Create dates array: only 10 days in future
        for (let i = 0; i <= 10; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(getDateString(date));
        }
        
        // For 90 days time range, cutoff would be at today + 180 (beyond array)
        const futureCutoffDate = new Date(today);
        futureCutoffDate.setDate(today.getDate() + 180);
        const futureCutoffString = getDateString(futureCutoffDate);
        
        const futureIdx = dates.findIndex(d => d > futureCutoffString);
        
        // Should return -1 when cutoff is beyond all dates
        expect(futureIdx).toBe(-1);
    });
});
