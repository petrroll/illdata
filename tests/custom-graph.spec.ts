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
