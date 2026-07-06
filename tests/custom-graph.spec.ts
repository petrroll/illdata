import { test, expect } from '@playwright/test';

test.describe('Custom Graph', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#customGraphToggleButton');
    await page.waitForSelector('canvas');
  });

  test('keeps selector hidden by default and toggles', async ({ page }) => {
    const toggleButton = page.locator('#customGraphToggleButton');
    const selector = page.locator('#customGraphSeriesSelector');

    await expect(toggleButton).toBeVisible();
    await expect(selector).toBeHidden();

    await toggleButton.click();
    await expect(selector).toBeVisible();
  });

  test('renders selected series and legend', async ({ page }) => {
    await page.locator('#customGraphToggleButton').click();
    const firstCheckbox = page.locator('#customGraphSeriesSelector input[type="checkbox"]').first();

    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.check();
    await page.waitForTimeout(300);

    const wrapper = page.locator('#customGraphChartWrapper');
    await expect(wrapper).toBeVisible();

    const legend = page.locator('#customGraphContainer-legend');
    await expect(legend).toBeVisible();
    const count = await legend.locator('> span').count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows trend dot on selected base series legend pill', async ({ page }) => {
    await page.locator('#customGraphToggleButton').click();
    const antigenCheckbox = page
      .locator('#customGraphSeriesSelector label', { hasText: /^Antigen Positivity \(28d avg\)$/ })
      .locator('input');

    await antigenCheckbox.check();

    const legend = page.locator('#customGraphContainer-legend');
    const antigenPill = legend.locator('> span').filter({ hasText: 'Antigen Positivity (28d avg) (MZCR)' }).first();
    const baseSegment = antigenPill.locator('> span').first();

    await expect(baseSegment.locator('.trend-dot')).toHaveCount(1);
  });

  test('legend keeps flex layout so pills stay spaced out', async ({ page }) => {
    // Regression for issue #176: toggling the legend visible reset display to ''
    // (block) which dropped the flex `gap`, bunching the pills together.
    await page.locator('#customGraphToggleButton').click();
    const checkboxes = page.locator('#customGraphSeriesSelector input[type="checkbox"]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();
    await page.waitForTimeout(300);

    const legend = page.locator('#customGraphContainer-legend');
    await expect(legend).toBeVisible();

    const display = await legend.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('flex');

    const gap = await legend.evaluate((el) => getComputedStyle(el).columnGap);
    expect(parseFloat(gap)).toBeGreaterThan(0);
  });

  test('clears selections and hides the chart', async ({ page }) => {
    await page.locator('#customGraphToggleButton').click();
    const firstCheckbox = page.locator('#customGraphSeriesSelector input[type="checkbox"]').first();
    await firstCheckbox.check();
    await page.waitForTimeout(200);

    const clearButton = page.locator('#customGraphSeriesSelector button', { hasText: 'Clear All' });
    await clearButton.click();
    await page.waitForTimeout(200);

    const wrapper = page.locator('#customGraphChartWrapper');
    await expect(wrapper).toBeHidden();

    const selections = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('customGraphSelections') || '[]');
    });
    expect(selections.length).toBe(0);
  });

  test('persists selections across reloads', async ({ page }) => {
    await page.locator('#customGraphToggleButton').click();
    const firstCheckbox = page.locator('#customGraphSeriesSelector input[type="checkbox"]').first();
    await firstCheckbox.check();
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForSelector('#customGraphToggleButton');

    const selections = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('customGraphSelections') || '[]');
    });
    expect(selections.length).toBeGreaterThan(0);

    const wrapper = page.locator('#customGraphChartWrapper');
    await expect(wrapper).toBeVisible();
  });
});
