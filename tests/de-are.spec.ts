import { test, expect } from '@playwright/test';

test.describe('Germany ARE Consultation Incidence chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    // Wait for the DE-ARE legend to be created
    await page.waitForSelector('#deAreContainer-legend');
  });

  test('renders the DE-ARE chart with a canvas and legend items', async ({ page }) => {
    const canvas = page.locator('#deAreChart');
    await expect(canvas).toBeVisible();

    const legend = page.locator('#deAreContainer-legend');
    await expect(legend).toBeVisible();

    const legendItems = legend.locator('> span');
    expect(await legendItems.count()).toBeGreaterThan(0);
  });

  test('shows the ARE consultation age-group series in the legend', async ({ page }) => {
    const legend = page.locator('#deAreContainer-legend');
    await expect(legend).toContainText('ARE Consultations (00+)');
    await expect(legend).toContainText('ARE Consultations (60+)');
  });

  test('persists DE-ARE series visibility toggling in localStorage', async ({ page }) => {
    const legend = page.locator('#deAreContainer-legend');
    const legendItems = legend.locator('> span');

    // Hide the first DE-ARE series
    await legendItems.first().click();
    await page.waitForTimeout(200);

    const visibility = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    const hasHiddenSeries = Object.values(visibility).some(v => v === false);
    expect(hasHiddenSeries).toBe(true);
  });

  test('translates DE-ARE series labels when switching language', async ({ page }) => {
    const legend = page.locator('#deAreContainer-legend');
    await expect(legend).toContainText('ARE Consultations (00+)');

    const languageSelect = page.locator('#languageSelect');
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(500);

    await expect(legend).toContainText('ARE konzultace (00+)');
  });
});
