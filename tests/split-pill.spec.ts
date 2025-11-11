import { test, expect } from '@playwright/test';

test.describe('Split Pill Legend Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    // Wait for legend to be created
    await page.waitForSelector('#czechDataContainer-legend');
    
    // Enable test numbers to see split pills
    const showTestNumbersCheckbox = page.locator('#showTestNumbers');
    const isChecked = await showTestNumbersCheckbox.isChecked();
    if (!isChecked) {
      await showTestNumbersCheckbox.check();
      await page.waitForTimeout(500);
    }
  });

  test('should display split pills for positive/negative test pairs', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Look for text that indicates split pills exist
    const positiveTestsText = czechLegend.getByText('Positive Tests');
    const negativeTestsText = czechLegend.getByText('Negative Tests');
    
    // Should have at least one occurrence of each
    await expect(positiveTestsText.first()).toBeVisible();
    await expect(negativeTestsText.first()).toBeVisible();
  });

  test('should toggle both tests when clicking prefix button', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Find "Antigen Positivity" or "PCR Positivity" text (these are the prefix buttons)
    // They should be in gray background spans
    const antigenPrefix = czechLegend.getByText('Antigen Positivity', { exact: true });
    
    // Check if it exists, if not skip test
    if (await antigenPrefix.count() === 0) {
      test.skip();
      return;
    }
    
    const firstPrefix = antigenPrefix.first();
    
    // Click the prefix to hide both
    await firstPrefix.click();
    await page.waitForTimeout(300);
    
    // Find the positive and negative test buttons for this series
    // After hiding, they should have strikethrough
    const positiveButton = czechLegend.getByText('Positive Tests').first();
    const textDecoration = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
    
    // Click prefix again to show both
    await firstPrefix.click();
    await page.waitForTimeout(300);
    
    // Now should not have strikethrough
    const textDecorationVisible = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecorationVisible).not.toContain('line-through');
  });

  test('should toggle individual test when clicking positive/negative button', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Find the first "Positive Tests" button
    const positiveButton = czechLegend.getByText('Positive Tests').first();
    
    // Click to hide positive tests
    await positiveButton.click();
    await page.waitForTimeout(300);
    
    // Check that it has strikethrough
    const textDecoration = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
    
    // Click again to re-enable
    await positiveButton.click();
    await page.waitForTimeout(300);
    
    // Check that strikethrough is removed
    const textDecorationVisible = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecorationVisible).not.toContain('line-through');
  });

  test('should show reduced opacity only when both tests are hidden', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    const positiveButton = czechLegend.getByText('Positive Tests').first();
    const negativeButton = czechLegend.getByText('Negative Tests').first();
    
    // Get parent element (the pill wrapper) by going up the DOM
    const pillWrapper = positiveButton.locator('xpath=../..');
    
    // Initially both visible, opacity should be 1
    let opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
    
    // Hide positive tests
    await positiveButton.click();
    await page.waitForTimeout(300);
    
    // Opacity should still be 1 (negative still visible)
    opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
    
    // Now hide negative tests too
    await negativeButton.click();
    await page.waitForTimeout(300);
    
    // Now opacity should be 0.5 (both hidden)
    opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('0.5');
    
    // Re-enable positive
    await positiveButton.click();
    await page.waitForTimeout(300);
    
    // Opacity should go back to 1
    opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
  });

  test('should persist split pill visibility state in localStorage', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Click a positive tests button
    const positiveButton = czechLegend.getByText('Positive Tests').first();
    await positiveButton.click();
    await page.waitForTimeout(300);
    
    // Verify it has strikethrough
    let textDecoration = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
    
    // Reload page
    await page.reload();
    await page.waitForSelector('#czechDataContainer-legend');
    await page.waitForTimeout(500);
    
    // Re-enable test numbers if needed
    const showTestNumbersCheckbox = page.locator('#showTestNumbers');
    const isChecked = await showTestNumbersCheckbox.isChecked();
    if (!isChecked) {
      await showTestNumbersCheckbox.check();
      await page.waitForTimeout(500);
    }
    
    // Find the same button again
    const reloadedLegend = page.locator('#czechDataContainer-legend');
    const reloadedPositiveButton = reloadedLegend.getByText('Positive Tests').first();
    
    // Should still have strikethrough
    textDecoration = await reloadedPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
  });

  test('should work in Czech language', async ({ page }) => {
    // Switch to Czech
    const languageSelect = page.locator('#languageSelect');
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(500);
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Look for Czech test labels - should contain "pozitivní" or "negativní"
    const positiveButtons = czechLegend.locator('span').filter({ hasText: /pozitivní/i });
    const negativeButtons = czechLegend.locator('span').filter({ hasText: /negativní/i });
    
    // Should find at least one of each
    expect(await positiveButtons.count()).toBeGreaterThan(0);
    expect(await negativeButtons.count()).toBeGreaterThan(0);
    
    // Test clicking
    const firstPositiveButton = positiveButtons.first();
    await firstPositiveButton.click();
    await page.waitForTimeout(300);
    
    // Should have strikethrough
    const textDecoration = await firstPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
  });
});
