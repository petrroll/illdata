import { test, expect } from '@playwright/test';

test.describe('LocalStorage Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('should persist language selection across page reloads', async ({ page }) => {
    // Change language to Czech
    await page.locator('#languageSelect').selectOption('cs');
    await page.waitForTimeout(300);
    
    // Reload
    await page.reload();
    await page.waitForSelector('#languageSelect');
    
    // Should still be Czech
    await expect(page.locator('#languageSelect')).toHaveValue('cs');
  });

  test('should persist time range selection', async ({ page }) => {
    // Change time range
    await page.locator('#timeRangeSelect').selectOption('90');
    await page.waitForTimeout(300);
    
    // Reload
    await page.reload();
    await page.waitForSelector('#timeRangeSelect');
    
    // Should persist
    await expect(page.locator('#timeRangeSelect')).toHaveValue('90');
  });

  test('should persist checkbox states', async ({ page }) => {
    // Change checkboxes
    await page.locator('#includeFutureCheckbox').check();
    await page.locator('#showExtremesCheckbox').check();
    await page.locator('#showShiftedCheckbox').uncheck();
    await page.waitForTimeout(300);
    
    // Reload
    await page.reload();
    await page.waitForSelector('#includeFutureCheckbox');
    
    // Should persist
    await expect(page.locator('#includeFutureCheckbox')).toBeChecked();
    await expect(page.locator('#showExtremesCheckbox')).toBeChecked();
    await expect(page.locator('#showShiftedCheckbox')).not.toBeChecked();
  });

  test('should persist shift settings', async ({ page }) => {
    // Change shift settings
    await page.locator('#alignByExtremeSelect').selectOption('days');
    await page.locator('#shiftOverrideInput').fill('200');
    await page.locator('#shiftOverrideInput').press('Enter');
    await page.waitForTimeout(300);
    
    // Reload
    await page.reload();
    await page.waitForSelector('#alignByExtremeSelect');
    
    // Should persist
    await expect(page.locator('#alignByExtremeSelect')).toHaveValue('days');
    await expect(page.locator('#shiftOverrideInput')).toHaveValue('200');
  });

  test('should persist series visibility across reloads', async ({ page }) => {
    // Helper function to hide a legend item completely (handles split pills)
    const hideItem = async (item: any) => {
      const children = item.locator('> span');
      const childCount = await children.count();
      
      if (childCount > 0) {
        // Split pill - click all children to hide all parts
        for (let i = 0; i < childCount; i++) {
          await children.nth(i).click();
          await page.waitForTimeout(50);
        }
      } else {
        // Regular pill
        await item.click();
        await page.waitForTimeout(50);
      }
    };
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('> span');
    
    // Hide first two series
    await hideItem(legendItems.nth(0));
    await hideItem(legendItems.nth(1));
    await page.waitForTimeout(300);
    
    // Verify at least some series are hidden in localStorage
    const visibility = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    const hasHiddenSeries = Object.values(visibility).some(v => v === false);
    expect(hasHiddenSeries).toBe(true);
    
    // Reload
    await page.reload();
    await page.waitForSelector('#czechDataContainer-legend');
    
    // Should still have hidden series
    const newLegend = page.locator('#czechDataContainer-legend');
    const newItems = newLegend.locator('> span');
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

  test('should persist country filter selection', async ({ page }) => {
    const countrySelect = page.locator('#euDataContainer-country-select');
    
    if (await countrySelect.count() > 0) {
      // Select a different country
      await countrySelect.selectOption({ index: 2 });
      await page.waitForTimeout(300);
      
      const selectedCountry = await countrySelect.inputValue();
      
      // Reload
      await page.reload();
      await page.waitForSelector('#euDataContainer-country-select');
      
      // Should persist
      const newSelect = page.locator('#euDataContainer-country-select');
      await expect(newSelect).toHaveValue(selectedCountry);
    }
  });

  test('should persist complex combined state', async ({ page }) => {
    // Make multiple changes
    await page.locator('#languageSelect').selectOption('cs');
    await page.locator('#timeRangeSelect').selectOption('180');
    await page.locator('#includeFutureCheckbox').check();
    await page.locator('#showShiftedCheckbox').uncheck();
    await page.locator('#alignByExtremeSelect').selectOption('minima');
    await page.locator('#shiftOverrideInput').fill('2');
    await page.locator('#shiftOverrideInput').press('Enter');
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('span');
    await legendItems.first().click();
    
    await page.waitForTimeout(500);
    
    // Reload
    await page.reload();
    await page.waitForSelector('#languageSelect');
    
    // Verify all persisted
    await expect(page.locator('#languageSelect')).toHaveValue('cs');
    await expect(page.locator('#timeRangeSelect')).toHaveValue('180');
    await expect(page.locator('#includeFutureCheckbox')).toBeChecked();
    await expect(page.locator('#showShiftedCheckbox')).not.toBeChecked();
    await expect(page.locator('#alignByExtremeSelect')).toHaveValue('minima');
    await expect(page.locator('#shiftOverrideInput')).toHaveValue('2');
    
    // Check at least one series is hidden
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

  test('should handle missing localStorage gracefully', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());
    
    // Reload
    await page.reload();
    await page.waitForSelector('#languageSelect');
    
    // Should use defaults
    await expect(page.locator('#languageSelect')).toHaveValue('en');
    await expect(page.locator('#timeRangeSelect')).toHaveValue('365');
    await expect(page.locator('#showShiftedCheckbox')).toBeChecked();
  });

  test('should handle corrupted localStorage data', async ({ page }) => {
    // Set invalid JSON in localStorage
    await page.evaluate(() => {
      localStorage.setItem('appSettings', 'invalid json {]');
    });
    
    // Reload
    await page.reload();
    await page.waitForSelector('#languageSelect');
    
    // Should fall back to defaults
    await expect(page.locator('#languageSelect')).toHaveValue('en');
    await expect(page.locator('#timeRangeSelect')).toHaveValue('365');
  });

  test('should migrate old localStorage format to new format', async ({ page }) => {
    // Set old-style individual keys
    await page.evaluate(() => {
      localStorage.setItem('selectedTimeRange', '90');
      localStorage.setItem('includeFuture', 'true');
      localStorage.setItem('showExtremes', 'true');
    });
    
    // Reload to trigger migration
    await page.reload();
    await page.waitForSelector('#timeRangeSelect');
    
    // Should migrate and apply old values
    await expect(page.locator('#timeRangeSelect')).toHaveValue('90');
    await expect(page.locator('#includeFutureCheckbox')).toBeChecked();
    await expect(page.locator('#showExtremesCheckbox')).toBeChecked();
    
    // Old keys should be removed
    const oldKeys = await page.evaluate(() => {
      return {
        timeRange: localStorage.getItem('selectedTimeRange'),
        includeFuture: localStorage.getItem('includeFuture'),
        showExtremes: localStorage.getItem('showExtremes')
      };
    });
    
    expect(oldKeys.timeRange).toBeNull();
    expect(oldKeys.includeFuture).toBeNull();
    expect(oldKeys.showExtremes).toBeNull();
  });
});
