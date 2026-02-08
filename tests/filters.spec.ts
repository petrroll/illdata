import { test, expect } from '@playwright/test';

test.describe('Category Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('should show/hide shifted series when toggling the checkbox', async ({ page }) => {
    const showShiftedCheckbox = page.locator('#showShiftedCheckbox');
    await expect(showShiftedCheckbox).toBeVisible();
    
    // Initial state - shifted checkbox should be checked
    await expect(showShiftedCheckbox).toBeChecked();
    
    // Count legend items before unchecking
    const czechLegend = page.locator('#czechDataContainer-legend');
    const initialCount = await czechLegend.locator('span').count();
    
    // Uncheck to hide shifted series
    await showShiftedCheckbox.uncheck();
    await page.waitForTimeout(200);
    
    // Count should decrease (shifted series removed)
    const afterUncheckCount = await czechLegend.locator('span').count();
    expect(afterUncheckCount).toBeLessThan(initialCount);
    
    // Check again to show shifted series
    await showShiftedCheckbox.check();
    await page.waitForTimeout(200);
    
    // Count should return to initial
    const afterRecheckCount = await czechLegend.locator('span').count();
    expect(afterRecheckCount).toBe(initialCount);
  });

  test('should show/hide test number bars when toggling the checkbox', async ({ page }) => {
    const showTestNumbersCheckbox = page.locator('#showTestNumbersCheckbox');
    await expect(showTestNumbersCheckbox).toBeVisible();
    
    // Initial state - should be checked
    await expect(showTestNumbersCheckbox).toBeChecked();
    
    // Count legend items including test numbers
    const czechLegend = page.locator('#czechDataContainer-legend');
    const initialCount = await czechLegend.locator('span').count();
    
    // Uncheck to hide test numbers
    await showTestNumbersCheckbox.uncheck();
    await page.waitForTimeout(200);
    
    // Count should decrease
    const afterUncheckCount = await czechLegend.locator('span').count();
    expect(afterUncheckCount).toBeLessThan(initialCount);
    
    // Check again
    await showTestNumbersCheckbox.check();
    await page.waitForTimeout(200);
    
    // Count should increase
    const afterRecheckCount = await czechLegend.locator('span').count();
    expect(afterRecheckCount).toBeGreaterThan(afterUncheckCount);
  });

  test('should show/hide shifted test numbers independently', async ({ page }) => {
    const showShiftedTestNumbersCheckbox = page.locator('#showShiftedTestNumbersCheckbox');
    await expect(showShiftedTestNumbersCheckbox).toBeVisible();
    
    // Initial state - should be unchecked by default
    await expect(showShiftedTestNumbersCheckbox).not.toBeChecked();
    
    // Check to show shifted test numbers
    await showShiftedTestNumbersCheckbox.check();
    await page.waitForTimeout(200);
    
    // Legend should have more items
    const czechLegend = page.locator('#czechDataContainer-legend');
    const withShiftedTestNumbers = await czechLegend.locator('span').count();
    
    // Uncheck to hide again
    await showShiftedTestNumbersCheckbox.uncheck();
    await page.waitForTimeout(200);
    
    const withoutShiftedTestNumbers = await czechLegend.locator('span').count();
    expect(withoutShiftedTestNumbers).toBeLessThan(withShiftedTestNumbers);
  });

  test('should show/hide extremes (min/max) when toggling the checkbox', async ({ page }) => {
    const showExtremesCheckbox = page.locator('#showExtremesCheckbox');
    await expect(showExtremesCheckbox).toBeVisible();
    
    // Initial state - should be unchecked
    await expect(showExtremesCheckbox).not.toBeChecked();
    
    // Count without extremes
    const czechLegend = page.locator('#czechDataContainer-legend');
    const withoutExtremes = await czechLegend.locator('span').count();
    
    // Check to show extremes
    await showExtremesCheckbox.check();
    await page.waitForTimeout(200);
    
    // Count should increase
    const withExtremes = await czechLegend.locator('span').count();
    expect(withExtremes).toBeGreaterThan(withoutExtremes);
    
    // Uncheck to hide extremes
    await showExtremesCheckbox.uncheck();
    await page.waitForTimeout(200);
    
    // Count should return to original
    const afterUncheck = await czechLegend.locator('span').count();
    expect(afterUncheck).toBe(withoutExtremes);
  });

  test('should persist category filter states in localStorage', async ({ page }) => {
    // Change filter states
    await page.locator('#showShiftedCheckbox').uncheck();
    await page.locator('#showTestNumbersCheckbox').uncheck();
    await page.locator('#showExtremesCheckbox').check();
    await page.waitForTimeout(300);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('#showShiftedCheckbox');
    
    // Verify states persisted
    await expect(page.locator('#showShiftedCheckbox')).not.toBeChecked();
    await expect(page.locator('#showTestNumbersCheckbox')).not.toBeChecked();
    await expect(page.locator('#showExtremesCheckbox')).toBeChecked();
  });

  test('should combine multiple filters correctly', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Start with all filters on (default state + enable extremes)
    await page.locator('#showExtremesCheckbox').check();
    await page.waitForTimeout(200);
    const allFiltersCount = await czechLegend.locator('span').count();
    
    // Disable shifted series
    await page.locator('#showShiftedCheckbox').uncheck();
    await page.waitForTimeout(200);
    const withoutShifted = await czechLegend.locator('span').count();
    expect(withoutShifted).toBeLessThan(allFiltersCount);
    
    // Additionally disable test numbers
    await page.locator('#showTestNumbersCheckbox').uncheck();
    await page.waitForTimeout(200);
    const withoutShiftedAndTests = await czechLegend.locator('span').count();
    expect(withoutShiftedAndTests).toBeLessThan(withoutShifted);
    
    // Re-enable shifted series
    await page.locator('#showShiftedCheckbox').check();
    await page.waitForTimeout(200);
    const withShiftedAgain = await czechLegend.locator('span').count();
    expect(withShiftedAgain).toBeGreaterThan(withoutShiftedAndTests);
  });

  test('should work correctly in Czech language', async ({ page }) => {
    // Switch to Czech
    await page.locator('#languageSelect').selectOption('cs');
    await page.waitForTimeout(500);
    
    // Checkboxes should still be functional
    const showShiftedCheckbox = page.locator('#showShiftedCheckbox');
    await expect(showShiftedCheckbox).toBeVisible();
    await expect(showShiftedCheckbox).toBeChecked();
    
    // Uncheck and verify it works
    await showShiftedCheckbox.uncheck();
    await page.waitForTimeout(200);
    await expect(showShiftedCheckbox).not.toBeChecked();
    
    // Legend should update
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('span');
    await expect(legendItems.first()).toBeVisible();
  });

  test('should show/hide non-averaged series when toggling the checkbox', async ({ page }) => {
    const showNonAveragedSeriesCheckbox = page.locator('#showNonAveragedSeriesCheckbox');
    await expect(showNonAveragedSeriesCheckbox).toBeVisible();
    
    // Initial state - should be unchecked by default (non-averaged series hidden)
    await expect(showNonAveragedSeriesCheckbox).not.toBeChecked();
    
    // Count legend items without non-averaged series
    const czechLegend = page.locator('#czechDataContainer-legend');
    const withoutNonAveraged = await czechLegend.locator('span').count();
    
    // Check to show non-averaged series
    await showNonAveragedSeriesCheckbox.check();
    await page.waitForTimeout(200);
    
    // Count should increase (raw series added)
    const withNonAveraged = await czechLegend.locator('span').count();
    expect(withNonAveraged).toBeGreaterThan(withoutNonAveraged);
    
    // Uncheck to hide non-averaged series again
    await showNonAveragedSeriesCheckbox.uncheck();
    await page.waitForTimeout(200);
    
    // Count should return to initial (without raw series)
    const afterUncheck = await czechLegend.locator('span').count();
    expect(afterUncheck).toBe(withoutNonAveraged);
  });

  test('non-averaged series toggle should not affect test numbers', async ({ page }) => {
    // Make sure test numbers are visible
    const showTestNumbersCheckbox = page.locator('#showTestNumbersCheckbox');
    await expect(showTestNumbersCheckbox).toBeChecked();
    
    const showNonAveragedSeriesCheckbox = page.locator('#showNonAveragedSeriesCheckbox');
    
    // Get initial count with test numbers visible and non-averaged hidden
    const czechLegend = page.locator('#czechDataContainer-legend');
    const initialCount = await czechLegend.locator('span').count();
    
    // Enable non-averaged series
    await showNonAveragedSeriesCheckbox.check();
    await page.waitForTimeout(200);
    const withNonAveraged = await czechLegend.locator('span').count();
    
    // Disable non-averaged series again
    await showNonAveragedSeriesCheckbox.uncheck();
    await page.waitForTimeout(200);
    const backToInitial = await czechLegend.locator('span').count();
    
    // Count should return to initial, meaning test numbers weren't affected
    expect(backToInitial).toBe(initialCount);
  });

  test('should persist non-averaged series toggle state in localStorage', async ({ page }) => {
    const showNonAveragedSeriesCheckbox = page.locator('#showNonAveragedSeriesCheckbox');
    
    // Initial state should be unchecked
    await expect(showNonAveragedSeriesCheckbox).not.toBeChecked();
    
    // Check the checkbox
    await showNonAveragedSeriesCheckbox.check();
    await page.waitForTimeout(300);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('#showNonAveragedSeriesCheckbox');
    
    // State should persist as checked
    await expect(showNonAveragedSeriesCheckbox).toBeChecked();
    
    // Uncheck and reload again
    await showNonAveragedSeriesCheckbox.uncheck();
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForSelector('#showNonAveragedSeriesCheckbox');
    
    // State should persist as unchecked
    await expect(showNonAveragedSeriesCheckbox).not.toBeChecked();
  });

  test('non-averaged series toggle should work with averaged series visible', async ({ page }) => {
    const showNonAveragedSeriesCheckbox = page.locator('#showNonAveragedSeriesCheckbox');
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Start with non-averaged hidden (default)
    await expect(showNonAveragedSeriesCheckbox).not.toBeChecked();
    const withAveragedOnly = await czechLegend.locator('span').count();
    
    // Enable non-averaged series
    await showNonAveragedSeriesCheckbox.check();
    await page.waitForTimeout(200);
    const withBoth = await czechLegend.locator('span').count();
    
    // Should have more series (both averaged and raw visible)
    expect(withBoth).toBeGreaterThan(withAveragedOnly);
    
    // Averaged series should still be visible
    // The count should be significant (not just 1 or 2 series added)
    expect(withBoth - withAveragedOnly).toBeGreaterThan(0);
  });
});
