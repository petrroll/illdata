import { test, expect } from '@playwright/test';

/**
 * E2E tests for the data freshness information in chart titles.
 * The title tells how old the freshest data point of the chart is, which - unlike the
 * update timestamp in the footer - does not change with every build.
 */

async function getChartTitle(page: import('@playwright/test').Page, index: number): Promise<string> {
  return await page.evaluate((chartIndex) => {
    const configs = (window as any).__chartConfigs;
    const chart = configs?.[chartIndex]?.chartHolder?.chart;
    const text = chart?.options?.plugins?.title?.text;
    return Array.isArray(text) ? text.join(' ') : (text ?? '');
  }, index);
}

test.describe('Chart Title Data Freshness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('shows how many days ago the newest data point is', async ({ page }) => {
    const title = await getChartTitle(page, 0);
    expect(title).toContain('latest data:');
    expect(title).toMatch(/latest data: (today|1 day ago|\d+ days ago)\)$/);
  });

  test('day count matches the newest date actually plotted', async ({ page }) => {
    const info = await page.evaluate(() => {
      const configs = (window as any).__chartConfigs;
      const chart = configs?.[0]?.chartHolder?.chart;
      const labels = (chart?.data?.labels ?? []) as string[];
      const text = chart?.options?.plugins?.title?.text as string;

      // Newest label with a value in a plain (non-shifted, non test-number) line dataset.
      // Shifted series are artificially moved in time and the test-number bars are padded
      // with zeros where the source data ends, so neither says anything about freshness.
      let latest: string | null = null;
      for (let i = labels.length - 1; i >= 0 && latest === null; i--) {
        const hasValue = chart.data.datasets.some((dataset: any) => {
          if (dataset.type === 'bar') return false;
          if (typeof dataset.label === 'string' && dataset.label.includes('shifted by')) return false;
          const value = dataset.data?.[i];
          return typeof value === 'number' && !isNaN(value);
        });
        if (hasValue) latest = labels[i];
      }

      return { title: text, latest, today: new Date().toISOString().split('T')[0] };
    });

    expect(info.latest).not.toBeNull();

    const days = Math.round(
      (Date.parse(`${info.today}T00:00:00Z`) - Date.parse(`${info.latest}T00:00:00Z`)) / (24 * 60 * 60 * 1000)
    );
    const expected = days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
    expect(info.title).toContain(`latest data: ${expected}`);
  });

  test('is localized when switching to Czech', async ({ page }) => {
    await page.locator('#languageSelect').selectOption('cs');
    await page.waitForTimeout(500);

    const title = await getChartTitle(page, 0);
    expect(title).toMatch(/nejnovější data: (dnes|před \d+ dnem|před \d+ dny)\)$/);
  });
});
