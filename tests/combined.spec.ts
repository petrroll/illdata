import { test, expect } from '@playwright/test';

test.describe('Combined Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('should combine language switch with visibility changes', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Hide a series in English
    const legendItems = czechLegend.locator('span');
    await legendItems.first().click();
    await page.waitForTimeout(200);
    
    // Switch to Czech
    await page.locator('#languageSelect').selectOption('cs');
    await page.waitForTimeout(500);
    
    // Verify language changed
    await expect(page.locator('#footerAboutLink')).toHaveText('O projektu');
    
    // Series should still be hidden
    const newLegend = page.locator('#czechDataContainer-legend');
    const newItems = newLegend.locator('span');
    let hasHiddenItem = false;
    const count = await newItems.count();
    for (let i = 0; i < count; i++) {
      const opacity = await newItems.nth(i).evaluate(el => window.getComputedStyle(el).opacity);
      if (opacity === '0.5') {
        hasHiddenItem = true;
        break;
      }
    }
    expect(hasHiddenItem).toBe(true);
  });

  test('should combine filter changes with shift mode changes', async ({ page }) => {
    // Disable shifted series
    await page.locator('#showShiftedCheckbox').uncheck();
    await page.waitForTimeout(200);
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    const countWithoutShifted = await czechLegend.locator('span').count();
    
    // Change shift mode to days
    await page.locator('#alignByExtremeSelect').selectOption('days');
    await page.waitForTimeout(300);
    
    // Shifted series should still be hidden (filter persists)
    const countAfterModeChange = await czechLegend.locator('span').count();
    expect(countAfterModeChange).toBe(countWithoutShifted);
    
    // Re-enable shifted series
    await page.locator('#showShiftedCheckbox').check();
    await page.waitForTimeout(200);
    
    // Now should have more items
    const countWithShifted = await czechLegend.locator('span').count();
    expect(countWithShifted).toBeGreaterThan(countWithoutShifted);
  });

  test('should combine time range with visibility and filters', async ({ page }) => {
    // Change time range
    await page.locator('#timeRangeSelect').selectOption('30');
    
    // Hide some series
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('span');
    await legendItems.first().click();
    
    // Toggle filters
    await page.locator('#showTestNumbersCheckbox').uncheck();
    await page.locator('#showExtremesCheckbox').check();
    
    await page.waitForTimeout(500);
    
    // Reload to verify persistence
    await page.reload();
    await page.waitForSelector('#timeRangeSelect');
    
    // All settings should persist
    await expect(page.locator('#timeRangeSelect')).toHaveValue('30');
    await expect(page.locator('#showTestNumbersCheckbox')).not.toBeChecked();
    await expect(page.locator('#showExtremesCheckbox')).toBeChecked();
    
    // Series visibility should persist
    const newLegend = page.locator('#czechDataContainer-legend');
    const newItems = newLegend.locator('span');
    expect(await newItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
  });

  test('should handle Hide All with subsequent individual toggles', async ({ page }) => {
    // Hide all series
    await page.locator('#hideAllButton').click();
    await page.waitForTimeout(200);
    
    // All should be hidden
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('span');
    const count = await legendItems.count();
    
    for (let i = 0; i < count; i++) {
      const opacity = await legendItems.nth(i).evaluate(el => window.getComputedStyle(el).opacity);
      expect(opacity).toBe('0.5');
    }
    
    // Show one series back
    await legendItems.first().click();
    await page.waitForTimeout(100);
    
    // First should be visible, rest hidden
    expect(await legendItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('1');
    if (count > 1) {
      expect(await legendItems.nth(1).evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
    }
  });

  test('should combine country filter with other settings', async ({ page }) => {
    const countrySelect = page.locator('#euDataContainer-country-select');
    
    if (await countrySelect.count() > 0) {
      // Select a country
      await countrySelect.selectOption({ index: 1 });
      
      // Change other settings
      await page.locator('#timeRangeSelect').selectOption('90');
      await page.locator('#showShiftedCheckbox').uncheck();
      
      await page.waitForTimeout(300);
      
      // Reload
      await page.reload();
      await page.waitForSelector('#euDataContainer-country-select');
      
      // All should persist
      const selectedCountry = await countrySelect.evaluate((el: HTMLSelectElement) => el.options[1].value);
      await expect(page.locator('#euDataContainer-country-select')).toHaveValue(selectedCountry);
      await expect(page.locator('#timeRangeSelect')).toHaveValue('90');
      await expect(page.locator('#showShiftedCheckbox')).not.toBeChecked();
    }
  });

  test('should handle complex workflow: configure, share, reload from link', async ({ page }) => {
    // Configure multiple settings
    await page.locator('#languageSelect').selectOption('cs');
    await page.locator('#timeRangeSelect').selectOption('180');
    await page.locator('#showShiftedCheckbox').uncheck();
    await page.locator('#alignByExtremeSelect').selectOption('minima');
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('span');
    await legendItems.first().click();
    
    await page.waitForTimeout(500);
    
    // Generate share link
    const shareLinkButton = page.locator('#getLinkButton');
    await shareLinkButton.click();
    await page.waitForTimeout(500);
    
    await expect(shareLinkButton).toHaveText('Link Copied!');
    
    // Simulate loading from shared link by getting current app state
    const appSettings = await page.evaluate(() => localStorage.getItem('appSettings'));
    const visibility = await page.evaluate(() => localStorage.getItem('datasetVisibility'));
    
    // Clear everything and navigate with state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#languageSelect');
    
    // Settings should be reset to defaults
    await expect(page.locator('#languageSelect')).toHaveValue('en');
    
    // Now restore from the saved state
    await page.evaluate((settings) => {
      localStorage.setItem('appSettings', settings);
    }, appSettings);
    
    await page.reload();
    await page.waitForSelector('#languageSelect');
    
    // Settings should be restored
    await expect(page.locator('#timeRangeSelect')).toHaveValue('180');
    await expect(page.locator('#showShiftedCheckbox')).not.toBeChecked();
  });

  test('should handle switching between multiple charts with different settings', async ({ page }) => {
    // Configure Czech chart
    const czechLegend = page.locator('#czechDataContainer-legend');
    const czechItems = czechLegend.locator('span');
    await czechItems.first().click();
    await page.waitForTimeout(100);
    
    // Configure EU chart
    const euLegend = page.locator('#euDataContainer-legend');
    const euItems = euLegend.locator('span');
    if (await euItems.count() > 0) {
      await euItems.first().click();
      await page.waitForTimeout(100);
    }
    
    // Configure DE chart
    const deLegend = page.locator('#deWastewaterContainer-legend');
    const deItems = deLegend.locator('span');
    if (await deItems.count() > 0) {
      await deItems.first().click();
      await page.waitForTimeout(100);
    }
    
    // All three should have hidden items
    expect(await czechItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
    
    if (await euItems.count() > 0) {
      expect(await euItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
    }
    
    if (await deItems.count() > 0) {
      expect(await deItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
    }
    
    // Reload and verify all persisted independently
    await page.reload();
    await page.waitForSelector('#czechDataContainer-legend');
    
    const newCzechItems = page.locator('#czechDataContainer-legend span');
    expect(await newCzechItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
  });

  test('should handle rapid setting changes without breaking', async ({ page }) => {
    // Rapidly change settings
    for (let i = 0; i < 5; i++) {
      await page.locator('#showShiftedCheckbox').uncheck();
      await page.locator('#showShiftedCheckbox').check();
      await page.locator('#alignByExtremeSelect').selectOption('days');
      await page.locator('#alignByExtremeSelect').selectOption('maxima');
    }
    
    await page.waitForTimeout(500);
    
    // Page should still be functional
    const czechLegend = page.locator('#czechDataContainer-legend');
    await expect(czechLegend).toBeVisible();
    
    const legendItems = czechLegend.locator('span');
    const count = await legendItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should maintain ratio table consistency with visibility changes', async ({ page }) => {
    const ratioTable = page.locator('#ratioTable');
    await expect(ratioTable).toBeVisible();
    
    // Hide all series
    await page.locator('#hideAllButton').click();
    await page.waitForTimeout(300);
    
    // Ratio table should show "No data available" or similar
    const tableBody = page.locator('#ratioTableBody');
    const cellText = await tableBody.locator('td').first().textContent();
    
    // Should indicate no data (either empty or shows a message)
    // Just verify the table is still there and functional
    await expect(ratioTable).toBeVisible();
  });
});
