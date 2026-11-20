import { test, expect } from '@playwright/test';

test.describe('Czech SZÚ Respiratory Viruses chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('#czSzuChart');
    await page.waitForSelector('#czSzuContainer-legend');
  });

  test('renders the SZÚ chart with per-virus legend items', async ({ page }) => {
    await expect(page.locator('#czSzuChart')).toBeVisible();

    const legend = page.locator('#czSzuContainer-legend');
    for (const name of [
      'SARS-CoV-2 Positivity',
      'Influenza Positivity',
      'RSV Positivity',
      'Rhinovirus Positivity',
      'Metapneumovirus Positivity',
      'Adenovirus Positivity',
      'Parainfluenza Positivity',
      'Seasonal Coronaviruses Positivity',
      'Enterovirus Positivity',
      'Mycoplasma pneumoniae Positivity',
    ]) {
      await expect(legend).toContainText(name);
    }
  });

  test('uses consecutive ISO-week Mondays across year boundaries', async ({ page }) => {
    const dates: string[] = await page.evaluate(() => {
      const cfg = (window as any).__chartConfigs.find((c: any) => c.containerId === 'czSzuContainer');
      return cfg.data.dates;
    });

    expect(dates.length).toBeGreaterThan(52);
    const years = new Set(dates.map(date => date.slice(0, 4)));
    expect(years.size).toBeGreaterThan(1);

    for (let i = 0; i < dates.length; i++) {
      const date = new Date(`${dates[i]}T00:00:00Z`);
      expect(date.getUTCDay()).toBe(1);
      if (i > 0) {
        const previous = new Date(`${dates[i - 1]}T00:00:00Z`);
        expect(date.getTime() - previous.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
      }
    }
  });

  test('translates the chart title to Czech', async ({ page }) => {
    await page.locator('#languageSelect').selectOption('cs');
    await page.waitForTimeout(500);

    const title = await page.evaluate(() => {
      const cfg = (window as any).__chartConfigs.find((c: any) => c.containerId === 'czSzuContainer');
      return cfg.chartHolder.chart.options.plugins.title.text;
    });
    expect(title).toContain('Respirační viry SZÚ');
  });
});
