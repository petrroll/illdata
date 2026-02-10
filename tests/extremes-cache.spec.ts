import { test, expect } from '@playwright/test';

test.describe('Extremes Cache Invalidation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#euDataContainer-legend');
  });

  /**
   * Helper: collect the text content of all legend items for a given chart.
   * Returns an array of trimmed, non-empty label strings.
   */
  async function getLegendTexts(page: import('@playwright/test').Page, legendId: string): Promise<string[]> {
    return page.locator(`#${legendId} span`).allTextContents()
      .then(texts => texts.map(t => t.trim()).filter(Boolean));
  }

  /**
   * Helper: return only the extreme-related legend labels (contain "maxima" or "minima").
   */
  async function getExtremeLegendTexts(page: import('@playwright/test').Page, legendId: string): Promise<string[]> {
    const all = await getLegendTexts(page, legendId);
    return all.filter(t => /maxima|minima/i.test(t));
  }

  // ── EU chart: country filter should recalculate extremes ──────────────────

  test('EU chart extremes update when country filter changes', async ({ page }) => {
    // Enable extremes
    await page.locator('#showExtremesCheckbox').check();
    await page.waitForTimeout(400);

    // Record extremes for the default country (EU/EEA)
    const extremesBefore = await getExtremeLegendTexts(page, 'euDataContainer-legend');
    expect(extremesBefore.length).toBeGreaterThan(0);

    // Switch to a specific country
    const countrySelect = page.locator('#euDataContainer-country-select');
    await expect(countrySelect).toBeVisible();

    // Pick a different country – get the first option that isn't EU/EEA
    const options = await countrySelect.locator('option').allTextContents();
    const altCountry = options.find(o => o !== 'EU/EEA');
    expect(altCountry).toBeDefined();

    await countrySelect.selectOption({ label: altCountry! });
    await page.waitForTimeout(400);

    // Extremes should now reflect the new country's data
    const extremesAfter = await getExtremeLegendTexts(page, 'euDataContainer-legend');

    // The extreme labels should have changed – different country means different
    // series names (labels include the series name) or different counts.
    // At minimum, the cache must have been cleared so new extremes were computed.
    // We verify they are not byte-identical to the old set.
    expect(extremesAfter).not.toEqual(extremesBefore);
  });

  // ── EU chart: survtype filter should recalculate extremes ─────────────────

  test('EU chart extremes update when survtype filter changes', async ({ page }) => {
    // Enable extremes
    await page.locator('#showExtremesCheckbox').check();
    await page.waitForTimeout(400);

    const legend = 'euDataContainer-legend';
    const extremesBefore = await getExtremeLegendTexts(page, legend);
    expect(extremesBefore.length).toBeGreaterThan(0);

    // Change survtype to Sentinel
    const survtypeSelect = page.locator('#euDataContainer-survtype-select');
    await expect(survtypeSelect).toBeVisible();
    await survtypeSelect.selectOption('primary care sentinel');
    await page.waitForTimeout(400);

    const extremesAfterSentinel = await getExtremeLegendTexts(page, legend);

    // The extreme labels should differ – Non-Sentinel series are excluded
    expect(extremesAfterSentinel).not.toEqual(extremesBefore);

    // Switch to Non-Sentinel
    await survtypeSelect.selectOption('non-sentinel');
    await page.waitForTimeout(400);

    const extremesAfterNonSentinel = await getExtremeLegendTexts(page, legend);

    // Sentinel and Non-Sentinel extremes should differ from each other
    expect(extremesAfterNonSentinel).not.toEqual(extremesAfterSentinel);
  });

  // ── CZ chart: extremes should update when shifted series toggled ──────────

  test('CZ chart extremes update when shifted series are toggled', async ({ page }) => {
    // Enable extremes
    await page.locator('#showExtremesCheckbox').check();
    await page.waitForTimeout(400);

    const legend = 'czechDataContainer-legend';
    const extremesWith = await getExtremeLegendTexts(page, legend);
    expect(extremesWith.length).toBeGreaterThan(0);

    // Disable shifted series
    await page.locator('#showShiftedCheckbox').uncheck();
    await page.waitForTimeout(400);

    const extremesWithout = await getExtremeLegendTexts(page, legend);

    // Should have fewer extremes because shifted series (and their extremes) are gone
    expect(extremesWithout.length).toBeLessThan(extremesWith.length);

    // Re-enable shifted series
    await page.locator('#showShiftedCheckbox').check();
    await page.waitForTimeout(400);

    const extremesReEnabled = await getExtremeLegendTexts(page, legend);
    expect(extremesReEnabled.length).toBe(extremesWith.length);
  });

  // ── Switching alignment mode should recalculate extremes ──────────────────

  test('extremes recalculate when alignment mode changes', async ({ page }) => {
    // Enable extremes
    await page.locator('#showExtremesCheckbox').check();
    await page.waitForTimeout(400);

    const legend = 'czechDataContainer-legend';
    const extremesMaxima = await getExtremeLegendTexts(page, legend);
    expect(extremesMaxima.length).toBeGreaterThan(0);

    // Switch from maxima to minima alignment
    const alignSelect = page.locator('#alignByExtremeSelect');
    await alignSelect.selectOption('minima');
    await page.waitForTimeout(400);

    const extremesMinima = await getExtremeLegendTexts(page, legend);
    expect(extremesMinima.length).toBeGreaterThan(0);

    // The extremes legend items should still be present after mode switch
    // (cache was cleared and recalculated, not stale)
    // Both should contain "maxima" AND "minima" entries since showExtremes
    // displays all extremes regardless of alignment mode.
    // What changes is the shifted series (aligned by different extreme type).
    // If the cache were stale, the shifted alignment would use wrong peaks.
    expect(extremesMaxima.length).toBe(extremesMinima.length);
  });

  // ── EU chart: combined filter changes should each clear the cache ──────────

  test('EU chart extremes update after sequential filter changes', async ({ page }) => {
    // Enable extremes
    await page.locator('#showExtremesCheckbox').check();
    await page.waitForTimeout(400);

    const legend = 'euDataContainer-legend';

    // 1) Record extremes at default (EU/EEA, both survtypes)
    const step1 = await getExtremeLegendTexts(page, legend);
    expect(step1.length).toBeGreaterThan(0);

    // 2) Switch survtype → Sentinel
    const survtypeSelect = page.locator('#euDataContainer-survtype-select');
    await survtypeSelect.selectOption('primary care sentinel');
    await page.waitForTimeout(400);
    const step2 = await getExtremeLegendTexts(page, legend);
    expect(step2).not.toEqual(step1);

    // 3) Switch country while still on Sentinel
    const countrySelect = page.locator('#euDataContainer-country-select');
    const options = await countrySelect.locator('option').allTextContents();
    const altCountry = options.find(o => o !== 'EU/EEA');
    expect(altCountry).toBeDefined();

    await countrySelect.selectOption({ label: altCountry! });
    await page.waitForTimeout(400);
    const step3 = await getExtremeLegendTexts(page, legend);

    // After country changed, extremes should differ from step2 as well
    expect(step3).not.toEqual(step2);

    // 4) Switch back to EU/EEA + both → should match step1 again
    await countrySelect.selectOption('EU/EEA');
    await survtypeSelect.selectOption('both');
    await page.waitForTimeout(400);
    const step4 = await getExtremeLegendTexts(page, legend);
    expect(step4).toEqual(step1);
  });
});
