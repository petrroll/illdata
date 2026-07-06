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

    const legendText = await legend.textContent();
    expect(legendText?.match(/Overall SARI Hospitalization Incidence/g)?.length).toBe(1);
  });

  test('shows trend dot for aggregate COVID-19 base legend pill despite trailing zeros', async ({ page }) => {
    const legend = page.locator('#deAreContainer-legend');
    const covidPill = legend.locator('> span').filter({ hasText: 'COVID-19 SARI Hospitalization Incidence' }).first();
    const baseSegment = covidPill.locator('> span').first();

    await expect(baseSegment.locator('.trend-dot')).toHaveCount(1);
  });

  test('filters DE-ARE series by selected age group', async ({ page }) => {
    const ageSelector = page.locator('#deAreContainer-ageGroup-select');
    await ageSelector.selectOption('0-4');
    await page.waitForTimeout(500);

    const storedAgeGroup = await page.evaluate(() => localStorage.getItem('deAgeGroupFilter'));
    expect(storedAgeGroup).toBe('0-4');

    const legend = page.locator('#deAreContainer-legend');
    await expect(legend).toContainText('Overall SARI Hospitalization Incidence');
    expect(await legend.locator('> span').count()).toBeLessThanOrEqual(4);

    const legendText = await legend.textContent();
    expect(legendText?.match(/Overall SARI Hospitalization Incidence/g)?.length).toBe(1);
  });

  test('restores age-group selection from shared URL state', async ({ page }) => {
    const stateData = {
      s: {
        timeRange: '365',
        includeFuture: true,
        showExtremes: false,
        showShifted: true,
        showTestNumbers: true,
        showShiftedTestNumbers: false,
        showNonAveragedSeries: false,
        shiftOverride: 1,
        alignByExtreme: 'maxima'
      },
      v: {},
      c: {},
      a: { deAgeGroupFilter: '5-14' },
      l: 'en'
    };
    const encoded = Buffer.from(JSON.stringify(stateData)).toString('base64');

    await page.goto(`/?state=${encoded}`);
    await page.waitForSelector('#deAreContainer-ageGroup-select');

    await expect(page.locator('#deAreContainer-ageGroup-select')).toHaveValue('5-14');
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
