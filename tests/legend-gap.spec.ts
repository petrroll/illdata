import { test, expect } from '@playwright/test';

/**
 * Regression test for the EU ECDC chart legend gap.
 *
 * The EU chart is the only chart with country/survtype filter selectors. When the
 * fixed height was applied directly to the container, those selectors shrank the
 * Chart.js canvas so its rotated x-axis labels overflowed into the legend placed
 * right below the container (see issue #168). The legend must always sit below the
 * chart canvas, with a gap comparable to charts without selectors (e.g. Czech).
 */
test.describe('Chart legend gap', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#euDataContainer-legend');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  async function measureGap(page: import('@playwright/test').Page, canvasId: string, containerId: string) {
    return page.evaluate(({ canvasId, containerId }) => {
      const canvas = document.getElementById(canvasId);
      const legend = document.getElementById(`${containerId}-legend`);
      if (!canvas || !legend) return null;
      return legend.getBoundingClientRect().top - canvas.getBoundingClientRect().bottom;
    }, { canvasId, containerId });
  }

  test('EU chart legend sits below the chart canvas (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(300);

    const euGap = await measureGap(page, 'euPositivityChart', 'euDataContainer');
    const czechGap = await measureGap(page, 'czechPositivityChart', 'czechDataContainer');

    expect(euGap).not.toBeNull();
    expect(czechGap).not.toBeNull();

    // Legend must not overlap the canvas (positive gap) ...
    expect(euGap!).toBeGreaterThan(0);
    // ... and the gap should be comparable to a chart without filter selectors.
    expect(Math.abs(euGap! - czechGap!)).toBeLessThan(10);
  });

  test('EU chart legend sits below the chart canvas (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    const euGap = await measureGap(page, 'euPositivityChart', 'euDataContainer');
    const czechGap = await measureGap(page, 'czechPositivityChart', 'czechDataContainer');

    expect(euGap).not.toBeNull();
    expect(czechGap).not.toBeNull();

    expect(euGap!).toBeGreaterThan(0);
    expect(Math.abs(euGap! - czechGap!)).toBeLessThan(10);
  });
});
