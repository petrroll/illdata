// Chart.js plugin drawing an emphasized horizontal baseline at the 1x level.
// Used in the derivative (ratio) view where 1x marks "no change" and therefore
// deserves a stronger line than a regular grid line.

import type { Plugin } from 'chart.js';

/** The ratio value ("no change") the baseline is drawn at. */
export const RATIO_BASELINE_VALUE = 1;

const BASELINE_COLOR = 'rgba(0, 0, 0, 0.55)';
const BASELINE_WIDTH = 2;

interface BaselineDrawingContext {
    save(): void;
    restore(): void;
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    stroke(): void;
    setLineDash(segments: number[]): void;
    lineWidth: number;
    strokeStyle: string | CanvasGradient | CanvasPattern;
}

interface BaselineChart {
    ctx: BaselineDrawingContext;
    chartArea?: { left: number; right: number; top: number; bottom: number };
    scales: { [scaleId: string]: { getPixelForValue(value: number): number } | undefined };
}

/**
 * Draws the 1x baseline across the chart area.
 * @returns true if the line was drawn, false if the chart isn't ready or 1x is out of view.
 */
export function drawRatioBaseline(chart: BaselineChart): boolean {
    const yScale = chart.scales?.['y'];
    const area = chart.chartArea;
    const ctx = chart.ctx;
    if (!yScale || !area || !ctx) return false;

    const y = yScale.getPixelForValue(RATIO_BASELINE_VALUE);
    // Skip drawing when 1x falls outside the visible value range
    if (!Number.isFinite(y) || y < area.top || y > area.bottom) return false;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.lineWidth = BASELINE_WIDTH;
    ctx.strokeStyle = BASELINE_COLOR;
    ctx.moveTo(area.left, y);
    ctx.lineTo(area.right, y);
    ctx.stroke();
    ctx.restore();
    return true;
}

/**
 * Inline plugin that has to be registered per chart (only for ratio views).
 * Drawn before the datasets so data lines stay on top of the baseline.
 */
export const ratioBaselinePlugin: Plugin<'line'> = {
    id: 'ratioBaseline',
    beforeDatasetsDraw(chart) {
        drawRatioBaseline(chart);
    }
};
