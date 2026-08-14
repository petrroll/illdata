import { describe, test, expect } from "bun:test";
import { drawRatioBaseline, ratioBaselinePlugin, RATIO_BASELINE_VALUE } from "./ratio-baseline";

interface DrawCall {
    op: string;
    args: number[];
}

function createMockContext() {
    const calls: DrawCall[] = [];
    return {
        calls,
        lineWidth: 0,
        strokeStyle: '' as string | CanvasGradient | CanvasPattern,
        lineDash: [] as number[],
        save() { calls.push({ op: 'save', args: [] }); },
        restore() { calls.push({ op: 'restore', args: [] }); },
        beginPath() { calls.push({ op: 'beginPath', args: [] }); },
        moveTo(x: number, y: number) { calls.push({ op: 'moveTo', args: [x, y] }); },
        lineTo(x: number, y: number) { calls.push({ op: 'lineTo', args: [x, y] }); },
        stroke() { calls.push({ op: 'stroke', args: [] }); },
        setLineDash(segments: number[]) { this.lineDash = segments; }
    };
}

// Simple linear scale mapping value 0 -> bottom pixel and maxValue -> top pixel
function createMockYScale(maxValue: number, top: number, bottom: number) {
    return {
        getPixelForValue(value: number) {
            return bottom - (value / maxValue) * (bottom - top);
        }
    };
}

describe("drawRatioBaseline Tests", () => {
    test("draws a horizontal line across the chart area at the 1x level", () => {
        const ctx = createMockContext();
        const chart = {
            ctx,
            chartArea: { left: 10, right: 110, top: 0, bottom: 200 },
            scales: { y: createMockYScale(2, 0, 200) }
        };

        expect(drawRatioBaseline(chart)).toBe(true);

        const moveTo = ctx.calls.find(call => call.op === 'moveTo');
        const lineTo = ctx.calls.find(call => call.op === 'lineTo');
        // 1x is half of the 0..2 range, so it sits in the middle of the chart area
        expect(moveTo).toEqual({ op: 'moveTo', args: [10, 100] });
        expect(lineTo).toEqual({ op: 'lineTo', args: [110, 100] });
        expect(ctx.calls.some(call => call.op === 'stroke')).toBe(true);
        // Context state is restored so other chart drawing is unaffected
        expect(ctx.calls[0]?.op).toBe('save');
        expect(ctx.calls[ctx.calls.length - 1]?.op).toBe('restore');
    });

    test("uses a stronger, solid line than regular grid lines", () => {
        const ctx = createMockContext();
        const chart = {
            ctx,
            chartArea: { left: 0, right: 100, top: 0, bottom: 100 },
            scales: { y: createMockYScale(2, 0, 100) }
        };

        drawRatioBaseline(chart);

        expect(ctx.lineWidth).toBeGreaterThan(1);
        expect(ctx.lineDash).toEqual([]);
        expect(typeof ctx.strokeStyle).toBe('string');
    });

    test("skips drawing when 1x is outside the visible value range", () => {
        const ctx = createMockContext();
        const chart = {
            ctx,
            chartArea: { left: 0, right: 100, top: 0, bottom: 100 },
            // Max value below 1x pushes the baseline above the chart area
            scales: { y: createMockYScale(0.5, 0, 100) }
        };

        expect(drawRatioBaseline(chart)).toBe(false);
        expect(ctx.calls.length).toBe(0);
    });

    test("skips drawing when the chart is not laid out yet", () => {
        const ctx = createMockContext();
        const chart = {
            ctx,
            chartArea: undefined,
            scales: { y: createMockYScale(2, 0, 100) }
        };

        expect(drawRatioBaseline(chart)).toBe(false);
        expect(ctx.calls.length).toBe(0);
    });

    test("skips drawing when there is no left y axis", () => {
        const ctx = createMockContext();
        const chart = {
            ctx,
            chartArea: { left: 0, right: 100, top: 0, bottom: 100 },
            scales: {}
        };

        expect(drawRatioBaseline(chart)).toBe(false);
        expect(ctx.calls.length).toBe(0);
    });

    test("plugin has an id and draws below the datasets", () => {
        expect(ratioBaselinePlugin.id).toBe('ratioBaseline');
        expect(typeof ratioBaselinePlugin.beforeDatasetsDraw).toBe('function');
    });

    test("baseline value is 1x (no change)", () => {
        expect(RATIO_BASELINE_VALUE).toBe(1);
    });
});
