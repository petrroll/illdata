import { test, expect, type Page } from '@playwright/test';
import { computeMovingAverageTimeseries, type TimeseriesData } from '../src/utils';

async function openOptions(page: Page) {
  if (await page.locator('#seriesOptionsPanel').isHidden()) await page.locator('#seriesOptionsToggle').click();
}

async function datasets(page: Page, chartIndex = 0) {
  return page.evaluate(index => (window as any).__chartConfigs[index].chartHolder.chart.data.datasets.map((ds: any) => ({
    label: ds.label, hidden: ds.hidden, axis: ds.yAxisID, dash: ds.borderDash, width: ds.borderWidth,
    format: ds.valueFormat, color: ds.borderColor
  })), chartIndex);
}

test.describe('Chart settings data and smoothing combinations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#czechDataContainer-legend');
    await openOptions(page);
  });

  test('keeps global settings together with compatible defaults and no site-footer controls', async ({ page }) => {
    await expect(page.locator('#globalSettings')).toHaveCount(1);
    await expect(page.locator('#globalSettings #dataOptions input')).toHaveCount(3);
    await expect(page.locator('#globalSettings #smoothingOptions input')).toHaveCount(3);
    for (const id of ['timeRangeSelect', 'includeFutureCheckbox', 'showExtremesCheckbox',
      'showShiftedCheckbox', 'showTestNumbersCheckbox', 'showShiftedTestNumbersCheckbox',
      'shiftOverrideInput', 'alignByExtremeSelect', 'hideAllButton', 'seriesOptionsToggle']) {
      await expect(page.locator(`#globalSettings #${id}`)).toHaveCount(1);
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    await expect(page.locator('footer input, footer select, footer button')).toHaveCount(0);
    await expect(page.locator('#data-raw')).toBeChecked();
    await expect(page.locator('#smoothing-28')).toBeChecked();
    await expect(page.locator('#smoothing-none')).not.toBeChecked();
    await expect(page.locator('#smoothing-7')).not.toBeChecked();
    await expect(page.locator('#derivativeViewSelect, #showNonAveragedSeriesCheckbox')).toHaveCount(0);
    await expect(page.locator('#seriesOptionsSummary')).toContainText('1 variants');
  });

  test('adds all nine unique, visibly distinct pairs without duplicating test bars', async ({ page }) => {
    await page.locator('#showShiftedCheckbox').uncheck();
    const before = await datasets(page);
    for (const id of ['data-ratio7', 'data-ratio28', 'smoothing-none', 'smoothing-7']) await page.locator(`#${id}`).check();
    const after = await datasets(page);
    const lines = after.filter((ds: any) => ds.axis !== 'y1');
    expect(lines).toHaveLength(18);
    expect(new Set(lines.map((ds: any) => ds.label)).size).toBe(18);
    expect(lines.every((ds: any) => !ds.hidden)).toBe(true);
    expect(after.filter((ds: any) => ds.axis === 'y1').length).toBe(before.filter((ds: any) => ds.axis === 'y1').length);
    const pcr = lines.filter((ds: any) => ds.label.startsWith('PCR'));
    expect(new Set(pcr.map((ds: any) => JSON.stringify([ds.color, ds.width]))).size).toBe(9);
    expect([...new Set(pcr.map((ds: any) => ds.width))].sort()).toEqual([1, 1.15, 1.3]);
    for (const line of pcr.filter((ds: any) => ds.format === 'ratio')) {
      expect(line.dash).toEqual([]);
    }
    expect(new Set(pcr.filter((ds: any) => ds.label.includes('(28d avg)')).map((ds: any) => ds.color)).size).toBe(3);
    await expect(page.locator('#seriesOptionsSummary')).toContainText('9 variants');
    await page.locator('#showShiftedCheckbox').check();
    const shiftedLines = (await datasets(page)).filter((ds: any) => ds.label.includes('shifted'));
    const shiftedRatios = shiftedLines.filter((ds: any) => ds.format === 'ratio');
    expect(shiftedRatios.length).toBeGreaterThan(0);
    expect(shiftedRatios.every((ds: any) => ds.dash.length === 0)).toBe(true);
    expect(shiftedLines.filter((ds: any) => ds.axis === 'y').every((ds: any) => ds.dash.length > 0)).toBe(true);
  });

  test('keeps raw/ratio axes and a visible 1x baseline separate, with correctly formatted tooltips', async ({ page }) => {
    await page.locator('#data-ratio7').check();
    const state = await page.evaluate(() => {
      const chart = (window as any).__chartConfigs[0].chartHolder.chart;
      const raw = chart.data.datasets.find((ds: any) => ds.label === 'PCR Positivity (28d avg)');
      const ratio = chart.data.datasets.find((ds: any) => ds.label === 'PCR Positivity (28d avg) - 7d Ratio');
      return {
        rawAxis: raw.yAxisID, ratioAxis: ratio.yAxisID,
        max: chart.options.scales.yRatio.suggestedMax,
        baseline: chart.config.plugins.some((plugin: any) => plugin.id === 'ratioBaseline'),
        tooltip: chart.options.plugins.tooltip.callbacks.label({ dataset: ratio, parsed: { y: 1.25 } }),
        rawTick: chart.options.scales.y.ticks.callback(1),
        ratioTick: chart.options.scales.yRatio.ticks.callback(1),
        baselineY: chart.scales.yRatio.getPixelForValue(1),
        top: chart.chartArea.top, bottom: chart.chartArea.bottom
      };
    });
    expect(state.rawAxis).toBe('y');
    expect(state.ratioAxis).toBe('yRatio');
    expect(state.max).toBe(1);
    expect(state.baseline).toBe(true);
    expect(state.tooltip).toContain('7d Ratio: 1.25x');
    expect(state.rawTick).toBe('1.00%');
    expect(state.ratioTick).toBe('1.00x');
    expect(state.baselineY).toBeGreaterThanOrEqual(state.top);
    expect(state.baselineY).toBeLessThanOrEqual(state.bottom);
    await page.locator('#data-ratio7').uncheck();
    expect(await page.evaluate(() => (window as any).__chartConfigs[0].chartHolder.chart.config.plugins.length)).toBe(0);
  });

  test('plots raw values, smoothed ratios, true zeros and gaps, then shifts each variant once', async ({ page }) => {
    const dates = Array.from({ length: 141 }, (_, i) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - 140 + i);
      return date.toISOString().split('T')[0];
    });
    const source: TimeseriesData = {
      dates, series: [{
        name: 'PCR Positivity', type: 'raw', dataType: 'positivity', frequencyInDays: 1,
        values: dates.map((_, i) => ({ positive: i === 140 ? 1 : i >= 84 ? 0 : i === 56 ? 100 : 10, tests: 100 }))
      }]
    };
    await page.evaluate(data => {
      const cfg = (window as any).__chartConfigs[0];
      cfg.data = data;
      cfg.extremesCache = undefined;
    }, computeMovingAverageTimeseries(source, [28]));
    await page.locator('#showShiftedCheckbox').uncheck();
    await page.locator('#smoothing-none').check();
    await page.locator('#smoothing-7').check();
    await page.locator('#data-ratio28').check();
    const plotted = await page.evaluate(() => {
      const ds = (window as any).__chartConfigs[0].chartHolder.chart.data.datasets;
      const get = (label: string) => ds.find((d: any) => d.label === label).data as number[];
      const raw = get('PCR Positivity - 28d Ratio');
      const avg = get('PCR Positivity (28d avg) - 28d Ratio');
      const week = get('PCR Positivity (7d avg) - 28d Ratio');
      return {
        absolute: get('PCR Positivity')[56], absoluteAverage: get('PCR Positivity (7d avg)')[56],
        rawZero: raw[111], averagedZero: avg[138], rawValue: raw[84], averagedValue: avg[84],
        expectedAverage: raw.slice(71, 99).reduce((sum, value) => sum + value, 0) / 28,
        week: week[84], expectedWeek: raw.slice(81, 88).reduce((sum, value) => sum + value, 0) / 7,
        startupGap: raw.slice(0, 55).every(Number.isNaN) && avg.slice(0, 55).every(Number.isNaN),
        zeroOverZero: raw[139] === 0 && avg[139] === 0,
        positiveOverZeroGap: Number.isNaN(raw[140]) && Number.isNaN(avg[140])
      };
    });
    expect(plotted.absolute).toBe(100);
    expect(plotted.absoluteAverage).toBeCloseTo(160 / 7);
    expect(plotted.rawZero).toBe(0);
    expect(plotted.averagedZero).toBe(0);
    expect(plotted.averagedValue).toBeCloseTo(plotted.expectedAverage, 10);
    expect(plotted.week).toBeCloseTo(plotted.expectedWeek, 10);
    expect(plotted.averagedValue).not.toBe(plotted.rawValue);
    expect(plotted.startupGap).toBe(true);
    expect(plotted.zeroOverZero).toBe(true);
    expect(plotted.positiveOverZeroGap).toBe(true);
    await page.locator('#alignByExtremeSelect').selectOption('days');
    await page.locator('#shiftOverrideInput').fill('10');
    await page.locator('#shiftOverrideInput').dispatchEvent('change');
    await page.locator('#showShiftedCheckbox').check();
    const shifted = await page.evaluate(() => {
      const ds = (window as any).__chartConfigs[0].chartHolder.chart.data.datasets;
      const base = ds.find((d: any) => d.label === 'PCR Positivity - 28d Ratio');
      const shifted = ds.find((d: any) => d.label === 'PCR Positivity - 28d Ratio shifted by -10d');
      return { base: base.data[70], shifted: shifted.data[80], axis: shifted.yAxisID,
        lines: ds.filter((d: any) => d.yAxisID !== 'y1').length };
    });
    expect(shifted.base).toBe(shifted.shifted);
    expect(shifted.axis).toBe('yRatio');
    expect(shifted.lines).toBe(12);
  });

  test('persists multiple selections and allows clearing either group and selecting again', async ({ page }) => {
    await page.locator('#data-ratio7').check();
    await page.locator('#smoothing-none').check();
    await page.reload();
    await openOptions(page);
    await expect(page.locator('#data-ratio7')).toBeChecked();
    await expect(page.locator('#smoothing-none')).toBeChecked();
    for (const id of ['data-raw', 'data-ratio7']) await page.locator(`#${id}`).uncheck();
    expect(await datasets(page)).toHaveLength(0);
    await expect(page.locator('#seriesOptionsSummary')).toContainText('No variants selected');
    await page.reload();
    await openOptions(page);
    expect(await datasets(page)).toHaveLength(0);
    await page.locator('#data-raw').check();
    expect((await datasets(page)).some((ds: any) => !ds.hidden)).toBe(true);
    for (const id of ['smoothing-none', 'smoothing-28']) await page.locator(`#${id}`).uncheck();
    expect(await datasets(page)).toHaveLength(0);
  });

  test('restores a shared multi-selection and migrates a legacy shared ratio view', async ({ page }) => {
    await page.locator('#data-ratio28').check();
    await page.locator('#smoothing-7').check();
    await page.locator('#getLinkButton').click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    await page.evaluate(() => localStorage.clear());
    await page.goto(link);
    await openOptions(page);
    await expect(page.locator('#data-raw')).toBeChecked();
    await expect(page.locator('#data-ratio28')).toBeChecked();
    await expect(page.locator('#smoothing-7')).toBeChecked();
    await page.locator('#data-ratio7').check();
    await page.locator('#languageSelect').selectOption('cs');
    await expect(page.locator('#data-ratio7')).toBeChecked();
    const state = { s: { derivativeView: '7', showNonAveragedSeries: true }, v: {}, c: {} };
    await page.goto(`/?state=${encodeURIComponent(Buffer.from(JSON.stringify(state)).toString('base64'))}`);
    await openOptions(page);
    await expect(page.locator('#data-raw')).not.toBeChecked();
    await expect(page.locator('#data-ratio7')).toBeChecked();
    await expect(page.locator('#smoothing-none')).toBeChecked();
    await expect(page.locator('#smoothing-28')).toBeChecked();
    expect((await datasets(page)).every((ds: any) => ds.axis === 'yRatio')).toBe(true);
  });

  test('shows newly added variants despite stored hidden datasets and retains deselected visibility', async ({ page }) => {
    await page.locator('#hideAllButton').click();
    await page.locator('#data-ratio7').check();
    let current = await datasets(page);
    expect(current.filter((ds: any) => ds.label.includes('7d Ratio') && !ds.label.includes('shifted')).every((ds: any) => !ds.hidden)).toBe(true);
    expect(current.filter((ds: any) => !ds.label.includes('7d Ratio')).every((ds: any) => ds.hidden)).toBe(true);
    await page.locator('#data-raw').uncheck();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('datasetVisibility')!));
    expect(saved['PCR Positivity (28d avg)']).toBe(false);
    await page.locator('#data-raw').check();
    current = await datasets(page);
    expect(current.find((ds: any) => ds.label === 'PCR Positivity (28d avg)').hidden).toBe(false);
  });

  test('shares an all-hidden chart without revealing it, but newly selected variants become visible', async ({ page }) => {
    await page.locator('#data-ratio7').check();
    await page.locator('#hideAllButton').click();
    await page.locator('#getLinkButton').click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    await page.evaluate(() => localStorage.clear());
    await page.goto(link);
    await openOptions(page);
    expect((await datasets(page)).every((ds: any) => ds.hidden)).toBe(true);
    await page.locator('#data-ratio28').check();
    expect((await datasets(page)).filter((ds: any) => ds.label.includes('28d Ratio') && !ds.label.includes('shifted'))
      .every((ds: any) => !ds.hidden)).toBe(true);
  });

  test('shows missing persisted variants and preserves explicit legacy ratio visibility', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('appSettings', JSON.stringify({ dataViews: ['raw', 'ratio7'], smoothingWindows: ['28'] }));
      localStorage.setItem('datasetVisibility', JSON.stringify({ 'PCR Positivity (28d avg)': false }));
    });
    await page.reload();
    await openOptions(page);
    let current = await datasets(page);
    expect(current.find((ds: any) => ds.label === 'PCR Positivity (28d avg) - 7d Ratio').hidden).toBe(false);
    await page.evaluate(() => {
      localStorage.setItem('appSettings', JSON.stringify({ derivativeView: '28' }));
      localStorage.setItem('datasetVisibility', JSON.stringify({ 'PCR Positivity (28d avg)': false, 'Antigen Positivity (28d avg)': true }));
    });
    await page.reload();
    await openOptions(page);
    current = await datasets(page);
    expect(current.find((ds: any) => ds.label === 'PCR Positivity (28d avg) - 28d Ratio').hidden).toBe(true);
    expect(current.find((ds: any) => ds.label === 'Antigen Positivity (28d avg) - 28d Ratio').hidden).toBe(false);
  });

  test('localizes controls and ratio labels without duplicating controls, supports keyboard closing', async ({ page }) => {
    await page.locator('#data-ratio7').check();
    await page.locator('#languageSelect').selectOption('cs');
    await expect(page.locator('#seriesOptionsToggle')).toHaveText('Možnosti sérií');
    await expect(page.locator('#smoothingOptions legend')).toHaveText('Vyhlazení');
    await expect(page.locator('#dataOptions')).toContainText('Poměr za 7 dní');
    await expect(page.locator('#czechDataContainer-legend')).toContainText('Poměr 7 dní');
    await expect(page.locator('#globalSettingsTitle')).toHaveText('Nastavení grafů');
    await expect(page.locator('#globalSettings #seriesOptionsPanel input[type=checkbox]')).toHaveCount(6);
    await expect(page.locator('#globalSettings #timeRangeSelect')).toHaveCount(1);
    await expect(page.locator('#data-ratio7')).toBeChecked();
    await page.locator('#data-ratio7').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#seriesOptionsPanel')).toBeHidden();
    await expect(page.locator('#seriesOptionsToggle')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('#seriesOptionsPanel')).toBeVisible();
    await page.locator('#languageSelect').selectOption('en');
    await expect(page.locator('#globalSettingsTitle')).toHaveText('Chart settings');
    await expect(page.locator('#globalSettings #seriesOptionsPanel input[type=checkbox]')).toHaveCount(6);
    await expect(page.locator('#globalSettings #timeRangeSelect')).toHaveCount(1);
    expect((await datasets(page)).some((ds: any) => ds.label === 'PCR Positivity (28d avg) - 7d Ratio' && !ds.hidden)).toBe(true);
  });

  test('does not transform custom graph selections a second time', async ({ page }) => {
    await page.locator('#seriesOptionsToggle').click();
    await page.locator('#customGraphToggleButton').click();
    await page.locator('#customGraphSeriesSelector label', { hasText: /^PCR Positivity — 7d Ratio$/ }).locator('input').check();
    const before = await datasets(page, 5);
    await openOptions(page);
    await page.locator('#data-ratio28').check();
    await page.locator('#smoothing-7').check();
    await page.locator('#smoothing-none').check();
    expect(await datasets(page, 5)).toEqual(before);
  });

  test('keeps settings usable at mobile width without enlarging the site footer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const footerHeight = (await page.locator('footer').boundingBox())!.height;
    await expect(page.locator('#dataOptions')).toBeVisible();
    await page.locator('#data-ratio7').check();
    const dimensions = await page.evaluate(() => {
      const footer = document.querySelector('footer')!.getBoundingClientRect();
      const settings = document.getElementById('globalSettings')!.getBoundingClientRect();
      return { left: footer.left, right: footer.right, height: footer.height, width: innerWidth,
        settingsLeft: settings.left, settingsRight: settings.right,
        space: parseFloat(getComputedStyle(document.getElementById('root')!).marginBottom) };
    });
    expect(dimensions.left).toBe(0);
    expect(dimensions.right).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.space).toBeGreaterThan(dimensions.height);
    expect(dimensions.settingsLeft).toBeGreaterThanOrEqual(0);
    expect(dimensions.settingsRight).toBeLessThanOrEqual(dimensions.width);
    await page.locator('#seriesOptionsToggle').click();
    expect((await page.locator('footer').boundingBox())!.height).toBe(footerHeight);
  });
});
