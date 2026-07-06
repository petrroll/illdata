import { test, expect } from '@playwright/test';

test.describe('Germany SARI Hospitalization Incidence chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#deAreContainer-legend');
  });

  test('renders the DE-ARE chart with a canvas, legend items, and age selector', async ({ page }) => {
    const canvas = page.locator('#deAreChart');
    await expect(canvas).toBeVisible();

    const ageSelector = page.locator('#deAreContainer-ageGroup-select');
    await expect(ageSelector).toBeVisible();
    await expect(ageSelector).toHaveValue('00+');

    const legend = page.locator('#deAreContainer-legend');
    await expect(legend).toBeVisible();

    const legendItems = legend.locator('> span');
    expect(await legendItems.count()).toBeGreaterThan(0);
  });

  test('shows pathogen series in the aggregate age-group legend', async ({ page }) => {
    const legend = page.locator('#deAreContainer-legend');
    await expect(legend).toContainText('Overall SARI Hospitalization Incidence');
    await expect(legend).toContainText('Influenza SARI Hospitalization Incidence');
    await expect(legend).toContainText('RSV SARI Hospitalization Incidence');
  });

  test('filters DE-ARE series by selected age group', async ({ page }) => {
    const ageSelector = page.locator('#deAreContainer-ageGroup-select');
    await ageSelector.selectOption('0-4');
    await page.waitForTimeout(500);

    const storedAgeGroup = await page.evaluate(() => localStorage.getItem('deAgeGroupFilter'));
    expect(storedAgeGroup).toBe('0-4');

    const legend = page.locator('#deAreContainer-legend');
    await expect(legend).toContainText('Overall SARI Hospitalization Incidence');
  });

  test('persists DE-ARE series visibility toggling in localStorage', async ({ page }) => {
    const legend = page.locator('#deAreContainer-legend');
    const legendItems = legend.locator('> span');

    await legendItems.first().click();
    await page.waitForTimeout(200);

    const visibility = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('deAreVisibility') || '{}');
    });
    const hasHiddenSeries = Object.values(visibility).some(v => v === false);
    expect(hasHiddenSeries).toBe(true);
  });

  test('translates DE-ARE series labels when switching language', async ({ page }) => {
    const legend = page.locator('#deAreContainer-legend');
    await expect(legend).toContainText('Influenza SARI Hospitalization Incidence');

    const languageSelect = page.locator('#languageSelect');
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(500);

    await expect(legend).toContainText('Chřipka SARI hospitalizační incidence');
    await expect(page.locator('label[for="deAreContainer-ageGroup-select"]')).toContainText('Věková skupina');
  });
});
