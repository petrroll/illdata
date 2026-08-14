import { test, expect } from '@playwright/test';

test.describe('Derivative (ratio) View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('should have derivative view selector with three options and default to off', async ({ page }) => {
    const derivativeSelect = page.locator('#derivativeViewSelect');
    await expect(derivativeSelect).toBeVisible();
    await expect(derivativeSelect.locator('option')).toHaveCount(3);
    await expect(derivativeSelect).toHaveValue('off');
  });

  test('should switch between ratio views and back keeping charts rendered', async ({ page }) => {
    const derivativeSelect = page.locator('#derivativeViewSelect');
    const legendItems = page.locator('#czechDataContainer-legend > span');
    const initialLegendCount = await legendItems.count();

    for (const view of ['7', '28', 'off']) {
      await derivativeSelect.selectOption(view);
      await page.waitForTimeout(500);
      await expect(derivativeSelect).toHaveValue(view);
      await expect(page.locator('#czechDataContainer canvas')).toBeVisible();
      // Test-number bars have no ratio equivalent, so only their pills disappear
      expect(await legendItems.count()).toBeGreaterThan(0);
    }

    // Switching back restores the full legend (including test number pills)
    expect(await legendItems.count()).toBe(initialLegendCount);
  });

  test('should work together with shifted series', async ({ page }) => {
    await page.locator('#showShiftedCheckbox').check();
    await page.locator('#derivativeViewSelect').selectOption('28');
    await page.waitForTimeout(500);

    // Shifted pills are still rendered in derivative view
    const shiftedPills = page.locator('#czechDataContainer-legend span', { hasText: 'shifted by' });
    expect(await shiftedPills.count()).toBeGreaterThan(0);
  });

  test('should persist derivative view in localStorage', async ({ page }) => {
    await page.locator('#derivativeViewSelect').selectOption('28');
    await page.waitForTimeout(300);

    await page.reload();
    await page.waitForSelector('#derivativeViewSelect');

    await expect(page.locator('#derivativeViewSelect')).toHaveValue('28');
    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('appSettings') || '{}'));
    expect(settings.derivativeView).toBe('28');
  });

  test('should draw an emphasized 1x baseline only in ratio views', async ({ page }) => {
    const readBaselineState = () => page.evaluate(() => {
      const chart = (window as any).__chartConfigs[0].chartHolder.chart;
      const canvas: HTMLCanvasElement = chart.canvas;
      const image = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;

      // Look for a horizontal line spanning most of the chart width that is painted
      // more strongly than regular grid lines (which land around alpha ~26).
      let strongHorizontalLines = 0;
      for (let y = 0; y < canvas.height; y++) {
        let strongPixels = 0;
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const [r, g, b, a] = [image[i], image[i + 1], image[i + 2], image[i + 3]];
          const isDarkGray = r < 160 && g < 160 && b < 160 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
          if (a > 50 && isDarkGray) strongPixels++;
        }
        if (strongPixels > canvas.width * 0.5) strongHorizontalLines++;
      }

      return {
        hasBaselinePlugin: (chart.config.plugins || []).some((plugin: any) => plugin.id === 'ratioBaseline'),
        suggestedMax: chart.options.scales.y.suggestedMax,
        strongHorizontalLines
      };
    });

    const absolute = await readBaselineState();
    expect(absolute.hasBaselinePlugin).toBe(false);
    expect(absolute.strongHorizontalLines).toBe(0);

    await page.locator('#derivativeViewSelect').selectOption('7');
    await page.waitForTimeout(500);

    const ratio = await readBaselineState();
    expect(ratio.hasBaselinePlugin).toBe(true);
    // The 1x level stays visible even when all ratios are below it
    expect(ratio.suggestedMax).toBe(1);
    expect(ratio.strongHorizontalLines).toBeGreaterThan(0);
  });

  test('should restore test number bars after switching back to absolute values', async ({ page }) => {
    const visibilityBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('datasetVisibility') || '{}'));

    await page.locator('#derivativeViewSelect').selectOption('7');
    await page.waitForTimeout(500);
    await page.locator('#derivativeViewSelect').selectOption('off');
    await page.waitForTimeout(500);

    const visibilityAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('datasetVisibility') || '{}'));
    Object.entries(visibilityBefore).forEach(([seriesName, visible]) => {
      expect(visibilityAfter[seriesName]).toBe(visible);
    });
  });
});
